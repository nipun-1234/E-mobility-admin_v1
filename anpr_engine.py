"""
E-Mobility Sri Lanka - Real-Time Automated Number Plate Recognition (ANPR / ALPR) Engine
========================================================================================
- Asynchronous non-blocking multi-threaded OCR pipeline (EasyOCR + PyTorch + OpenCV)
- Metric ROI plate localization & adaptive image enhancement
- Sri Lankan license plate normalization, format validation, and positional character disambiguation
- Multi-frame confidence-weighted consensus per ByteTrack track ID
- Failure resilience and non-fabrication guarantee (Unread/Low-confidence vs Validated)
"""

import os
import sys
import re
import time
import queue
import threading
import cv2
import numpy as np

# Set UTF-8 encoding for Windows console compatibility
os.environ["PYTHONIOENCODING"] = "utf-8"

# -----------------------------------------------------------------------------
# Configuration Constants (Environment-configurable with safe defaults)
# -----------------------------------------------------------------------------
ANPR_ENABLED = os.environ.get("ANPR_ENABLED", "true").lower() in ("true", "1", "yes")
ANPR_MIN_CONFIDENCE = float(os.environ.get("ANPR_MIN_CONFIDENCE", "0.60"))
ANPR_OCR_INTERVAL = int(os.environ.get("ANPR_OCR_INTERVAL", "5")) # Process OCR every N frames per track
ANPR_MAX_OBSERVATIONS = int(os.environ.get("ANPR_MAX_OBSERVATIONS", "10"))
ANPR_QUEUE_MAXSIZE = int(os.environ.get("ANPR_QUEUE_MAXSIZE", "500"))

# Valid Sri Lankan Province Codes
SL_PROVINCES = {"WP", "CP", "SP", "NP", "EP", "NW", "NC", "UP", "SG"}

# Regex Patterns for Sri Lankan Vehicle Plates
RE_SL_PROVINCIAL = re.compile(r"^(WP|CP|SP|NP|EP|NW|NC|UP|SG)\s*([A-Z]{2,3})[-\s]*([0-9]{4})$")
RE_SL_STANDARD = re.compile(r"^([A-Z]{2,3})[-\s]*([0-9]{4})$")
RE_SL_NUMERIC = re.compile(r"^([0-9]{2,3})[-\s]*([0-9]{4})$")

# Character Disambiguation Maps
CHAR_TO_DIGIT = {
    'O': '0', 'D': '0', 'Q': '0', 'U': '0',
    'I': '1', 'l': '1', '|': '1', 'J': '1', 'T': '1',
    'Z': '2',
    'E': '3',
    'A': '4',
    'S': '5',
    'G': '6', 'b': '6',
    'B': '8',
    'g': '9', 'q': '9'
}

CHAR_TO_LETTER = {
    '0': 'O',
    '1': 'I',
    '2': 'Z',
    '3': 'E',
    '4': 'A',
    '5': 'S',
    '6': 'G',
    '8': 'B'
}


class AnprEngine:
    """Singleton-capable ANPR Engine running asynchronous background OCR workers"""

    _instance = None
    _lock = threading.Lock()

    def __new__(cls, *args, **kwargs):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(AnprEngine, cls).__new__(cls)
                cls._instance._initialized = False
            return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self._initialized = True

        self.enabled = ANPR_ENABLED
        self.min_confidence = ANPR_MIN_CONFIDENCE
        self.reader = None
        self.ocr_lock = threading.Lock()

        # Track consensus store: track_id -> dict of observations & aggregated consensus
        self.track_data = {}
        self.track_data_lock = threading.Lock()

        # Asynchronous OCR Request Queue
        self.ocr_queue = queue.Queue(maxsize=ANPR_QUEUE_MAXSIZE)
        self.running = True

        # Initialize OCR Engine in background to avoid blocking server boot
        self._init_thread = threading.Thread(target=self._init_reader, daemon=True, name="ANPR-Init")
        self._init_thread.start()

        # Start background OCR worker threads
        self.worker_thread = threading.Thread(target=self._ocr_worker_loop, daemon=True, name="ANPR-Worker")
        self.worker_thread.start()

    def _init_reader(self):
        """Initializes EasyOCR models safely"""
        try:
            import easyocr
            with self.ocr_lock:
                self.reader = easyocr.Reader(['en'], gpu=False, verbose=False)
            print("🚀 [ANPR ENGINE] EasyOCR Reader initialized successfully.")
        except Exception as e:
            print(f"⚠️ [ANPR ENGINE] Could not initialize EasyOCR reader ({e}). Fallback to heuristics.")

    def _ocr_worker_loop(self):
        """Asynchronous background worker executing OCR on vehicle crops"""
        while self.running:
            try:
                task = self.ocr_queue.get(timeout=0.5)
                if task is None:
                    break

                cam_id, track_id, crop_img, full_frame_pts = task
                self._process_single_crop(cam_id, track_id, crop_img)
                self.ocr_queue.task_done()
            except queue.Empty:
                continue
            except Exception as e:
                print(f"⚠️ [ANPR WORKER ERROR]: {e}")

    def submit_vehicle_crop(self, cam_id, track_id, vehicle_crop, frame_count):
        """Non-blocking submission of vehicle bounding box crop for ANPR processing"""
        if not self.enabled or vehicle_crop is None or vehicle_crop.size == 0:
            return

        # Check sampling interval
        with self.track_data_lock:
            if track_id not in self.track_data:
                self.track_data[track_id] = {
                    'cam_id': cam_id,
                    'last_ocr_frame': 0,
                    'observations': [],
                    'best_plate': None,
                    'best_raw_text': None,
                    'best_confidence': 0.0,
                    'best_status': 'UNREAD',
                    'best_crop': None,
                    'last_updated': time.time()
                }

            t_info = self.track_data[track_id]
            if frame_count - t_info['last_ocr_frame'] < ANPR_OCR_INTERVAL:
                return

            if len(t_info['observations']) >= ANPR_MAX_OBSERVATIONS:
                return

            t_info['last_ocr_frame'] = frame_count

        # Put crop into non-blocking OCR worker queue
        if not self.ocr_queue.full():
            try:
                # Make a shallow copy of the crop to avoid race conditions with video buffer
                self.ocr_queue.put_nowait((cam_id, track_id, vehicle_crop.copy(), None))
            except queue.Full:
                pass

    def _process_single_crop(self, cam_id, track_id, vehicle_crop):
        """Extracts candidate plate ROI, enhances contrast, runs OCR, and updates track consensus"""
        if vehicle_crop is None or vehicle_crop.size == 0:
            return

        vh, vw = vehicle_crop.shape[:2]
        if vh < 25 or vw < 40:
            return

        # 1. License Plate ROI Localization (Lower 45% of vehicle bbox)
        roi_y1 = int(vh * 0.50)
        roi_y2 = vh
        roi_x1 = int(vw * 0.10)
        roi_x2 = int(vw * 0.90)

        plate_roi = vehicle_crop[roi_y1:roi_y2, roi_x1:roi_x2]
        if plate_roi.size == 0:
            plate_roi = vehicle_crop

        # 2. Image Preprocessing & Contrast Enhancement
        enhanced_crop = self.preprocess_plate_image(plate_roi)

        # 3. Execute OCR
        raw_text = ""
        ocr_conf = 0.0

        with self.ocr_lock:
            if self.reader is not None:
                try:
                    # Run EasyOCR on both standard and enhanced crops
                    results = self.reader.readtext(enhanced_crop, detail=1, paragraph=False)
                    if not results:
                        results = self.reader.readtext(plate_roi, detail=1, paragraph=False)

                    if results:
                        # Find highest confidence or combined text
                        valid_chunks = []
                        confs = []
                        for item in results:
                            # EasyOCR returns ([box], text, conf)
                            if len(item) >= 3:
                                _, text, conf = item
                                txt_clean = str(text).strip()
                                if len(txt_clean) >= 2:
                                    valid_chunks.append(txt_clean)
                                    confs.append(float(conf))

                        if valid_chunks:
                            raw_text = " ".join(valid_chunks)
                            ocr_conf = float(np.mean(confs)) if confs else 0.0
                except Exception as ocr_err:
                    print(f"⚠️ [ANPR OCR ERROR]: {ocr_err}")

        # 4. Normalize & Validate Sri Lankan Plate Format
        norm_plate, status = self.normalize_and_validate_plate(raw_text, ocr_conf)

        # 5. Multi-Frame Consensus Update
        with self.track_data_lock:
            if track_id in self.track_data:
                t_info = self.track_data[track_id]
                obs_entry = {
                    'raw_text': raw_text,
                    'normalized_plate': norm_plate,
                    'confidence': ocr_conf,
                    'status': status,
                    'timestamp': time.time()
                }
                t_info['observations'].append(obs_entry)

                # Keep best plate crop
                if plate_roi.size > 0 and (t_info['best_crop'] is None or ocr_conf > t_info['best_confidence']):
                    t_info['best_crop'] = plate_roi

                # Compute confidence-weighted consensus across all observations
                self._update_consensus(t_info)

    def extract_plate_roi(self, vehicle_crop):
        """Extracts candidate plate ROI (Lower 50% of vehicle bbox)"""
        if vehicle_crop is None or vehicle_crop.size == 0:
            return None
        vh, vw = vehicle_crop.shape[:2]
        if vh < 25 or vw < 40:
            return vehicle_crop
        roi_y1 = int(vh * 0.50)
        roi_y2 = vh
        roi_x1 = int(vw * 0.10)
        roi_x2 = int(vw * 0.90)
        plate_roi = vehicle_crop[roi_y1:roi_y2, roi_x1:roi_x2]
        return plate_roi if plate_roi.size > 0 else vehicle_crop

    def localize_plate_roi(self, vehicle_crop):
        return self.extract_plate_roi(vehicle_crop)

    def process_vehicle_crop_direct(self, veh_crop, track_id=1, camera_id="cam_01"):
        """Synchronous helper for testing and direct frame evaluation"""
        plate_roi = self.extract_plate_roi(veh_crop)
        if plate_roi is None or plate_roi.size == 0:
            return {
                'raw_text': '',
                'normalized_plate': None,
                'confidence': 0.0,
                'status': 'UNREAD',
                'plate_roi': None
            }

        enhanced = self.preprocess_plate_image(plate_roi)
        raw_text = ""
        ocr_conf = 0.0

        with self.ocr_lock:
            if self.reader is not None:
                try:
                    results = self.reader.readtext(enhanced, detail=1, paragraph=False)
                    if not results:
                        results = self.reader.readtext(plate_roi, detail=1, paragraph=False)

                    if results:
                        valid_chunks = []
                        confs = []
                        for item in results:
                            if len(item) >= 3:
                                _, text, conf = item
                                txt_clean = str(text).strip()
                                if len(txt_clean) >= 2:
                                    valid_chunks.append(txt_clean)
                                    confs.append(float(conf))

                        if valid_chunks:
                            raw_text = " ".join(valid_chunks)
                            ocr_conf = float(np.mean(confs)) if confs else 0.0
                except Exception as err:
                    print(f"⚠️ [ANPR DIRECT OCR ERROR]: {err}")

        norm_plate, status = self.normalize_and_validate_plate(raw_text, ocr_conf)
        return {
            'raw_text': raw_text,
            'normalized_plate': norm_plate,
            'confidence': ocr_conf,
            'status': status,
            'plate_roi': plate_roi
        }

    def preprocess_plate_image(self, img):
        """Applies adaptive grayscale, CLAHE contrast enhancement, and sharpening for OCR"""
        try:
            if len(img.shape) == 3:
                gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            else:
                gray = img.copy()

            # Resize to optimal height for OCR
            h, w = gray.shape[:2]
            target_h = 72
            scale = target_h / max(h, 1)
            target_w = max(int(w * scale), 160)
            resized = cv2.resize(gray, (target_w, target_h), interpolation=cv2.INTER_CUBIC)

            # Apply CLAHE (Contrast Limited Adaptive Histogram Equalization)
            clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
            enhanced = clahe.apply(resized)

            # Bilateral filter to smooth noise while preserving character edges
            denoised = cv2.bilateralFilter(enhanced, 7, 50, 50)
            return denoised
        except Exception:
            return img

    def normalize_and_validate_plate(self, raw_text, confidence):
        """
        Normalizes raw OCR string into Sri Lankan standard registration format
        and validates structure. Returns (normalized_plate, status).
        """
        if not raw_text or not raw_text.strip():
            return None, 'UNREAD'

        # 1. Clean string
        cleaned = raw_text.upper().strip()
        cleaned = re.sub(r'[^A-Z0-9\s\-]', '', cleaned)
        cleaned = re.sub(r'\s+', ' ', cleaned).strip()

        if len(cleaned) < 4:
            return None, 'UNREAD'

        # Tokenize words
        tokens = cleaned.replace('-', ' ').split()
        if not tokens:
            return None, 'UNREAD'

        # 2. Check for Provincial Prefix (e.g. WP, SP, CP, NW, etc.)
        prov = None
        letters = None
        digits = None
        numeric_vintage = None

        if len(tokens) >= 3:
            # Format: PROV LETTERS DIGITS (e.g. "WP" "CAB" "4521")
            prov_cand = tokens[0]
            if prov_cand in SL_PROVINCES:
                prov = prov_cand
                letters = tokens[1]
                digits = tokens[2]
            else:
                # Combined or vintage format
                letters = tokens[0]
                digits = "".join(tokens[1:])
        elif len(tokens) == 2:
            # Format: "WP" "CAB4521" OR "CAB" "4521" OR "19" "4521"
            if tokens[0] in SL_PROVINCES:
                prov = tokens[0]
                rest = tokens[1]
                m = re.match(r'^([A-Z]+)(\d+)$', rest)
                if m:
                    letters, digits = m.groups()
                else:
                    letters = rest
            elif tokens[0].isdigit() and tokens[1].isdigit():
                numeric_vintage = f"{tokens[0]}-{tokens[1]}"
            else:
                m_prov = re.match(r'^(WP|CP|SP|NP|EP|NW|NC|UP|SG)([A-Z]+)$', tokens[0])
                if m_prov:
                    prov, letters = m_prov.groups()
                    digits = tokens[1]
                else:
                    letters = tokens[0]
                    digits = tokens[1]
        elif len(tokens) == 1:
            # Single combined string (e.g. "WPCAB4521" or "CAB4521" or "651234")
            full = tokens[0]
            m1 = re.match(r'^(WP|CP|SP|NP|EP|NW|NC|UP|SG)([A-Z]{2,3})(\d{3,4})$', full)
            if m1:
                prov, letters, digits = m1.groups()
            else:
                m2 = re.match(r'^([A-Z]{2,3})(\d{3,4})$', full)
                if m2:
                    letters, digits = m2.groups()
                else:
                    m3 = re.match(r'^(\d{2,3})(\d{4})$', full)
                    if m3:
                        numeric_vintage = f"{m3.group(1)}-{m3.group(2)}"

        if numeric_vintage:
            candidate_plate = numeric_vintage
        else:
            # 3. Disambiguate Characters based on positional rules
            if letters:
                letters_disambiguated = ""
                for c in letters:
                    letters_disambiguated += CHAR_TO_LETTER.get(c, c)
                letters = letters_disambiguated

            if digits:
                digits_disambiguated = ""
                for c in digits:
                    digits_disambiguated += CHAR_TO_DIGIT.get(c, c)
                digits = digits_disambiguated

            # 4. Construct candidate normalized string
            candidate_plate = None
            if prov and letters and digits and len(digits) == 4:
                candidate_plate = f"{prov} {letters}-{digits}"
            elif letters and digits and len(digits) >= 3:
                candidate_plate = f"{letters}-{digits}"
            elif cleaned:
                candidate_plate = cleaned

        if not candidate_plate:
            return None, 'UNREAD'

        # 5. Format Validation
        is_valid_format = bool(
            RE_SL_PROVINCIAL.match(candidate_plate) or
            RE_SL_STANDARD.match(candidate_plate) or
            RE_SL_NUMERIC.match(candidate_plate)
        )

        if is_valid_format and confidence >= self.min_confidence:
            return candidate_plate, 'VALID'
        elif is_valid_format and confidence >= 0.35:
            return candidate_plate, 'LOW_CONFIDENCE'
        elif not is_valid_format and confidence >= 0.70:
            return candidate_plate, 'INVALID'

        return None, 'UNREAD'

    def _update_consensus(self, t_info):
        """Aggregates multiple OCR observations into a single confidence-weighted consensus"""
        obs_list = t_info.get('observations', [])
        if not obs_list:
            return

        valid_obs = [o for o in obs_list if o['normalized_plate'] and o['status'] in ('VALID', 'LOW_CONFIDENCE')]
        if not valid_obs:
            t_info['best_plate'] = None
            t_info['best_status'] = 'UNREAD'
            t_info['best_confidence'] = 0.0
            return

        # Score candidates by frequency and confidence weight
        scores = {}
        status_by_cand = {}
        raw_by_cand = {}
        for o in valid_obs:
            p = o['normalized_plate']
            scores[p] = scores.get(p, 0.0) + float(o['confidence'])
            status_by_cand[p] = o['status']
            raw_by_cand[p] = o['raw_text']

        # Pick candidate with highest score
        best_cand = max(scores, key=scores.get)
        count = sum(1 for o in valid_obs if o['normalized_plate'] == best_cand)
        avg_conf = scores[best_cand] / count

        # If seen in multiple frames with high confidence, upgrade to VALID
        final_status = status_by_cand.get(best_cand, 'VALID')
        if count >= 2 and avg_conf >= self.min_confidence:
            final_status = 'VALID'

        t_info['best_plate'] = best_cand
        t_info['best_raw_text'] = raw_by_cand.get(best_cand, best_cand)
        t_info['best_confidence'] = round(avg_conf, 2)
        t_info['best_status'] = final_status
        t_info['last_updated'] = time.time()

    def get_track_plate(self, track_id):
        """
        Retrieves the real recognized plate for a ByteTrack track ID.
        Returns dict with (plate, raw_text, confidence, status, crop_img).
        Guarantees NO fabricated plate.
        """
        with self.track_data_lock:
            if track_id in self.track_data:
                t = self.track_data[track_id]
                return {
                    'plate': t.get('best_plate'),
                    'raw_text': t.get('best_raw_text'),
                    'confidence': t.get('best_confidence', 0.0),
                    'status': t.get('best_status', 'UNREAD'),
                    'crop_img': t.get('best_crop')
                }

        return {
            'plate': None,
            'raw_text': None,
            'confidence': 0.0,
            'status': 'UNREAD',
            'crop_img': None
        }

    def clear_old_tracks(self, active_track_ids):
        """Purges cached track data for tracks that have exited the frame"""
        with self.track_data_lock:
            active_set = set(active_track_ids)
            keys_to_del = [tid for tid in self.track_data if tid not in active_set and (time.time() - self.track_data[tid].get('last_updated', 0)) > 60.0]
            for tid in keys_to_del:
                del self.track_data[tid]


# Global engine singleton
anpr_engine = AnprEngine()

def get_anpr_engine():
    return anpr_engine
