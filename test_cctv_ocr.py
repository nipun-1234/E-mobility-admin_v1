import cv2
import os
import sys
import numpy as np

# Ensure UTF-8 output
sys.stdout.reconfigure(encoding='utf-8')

from anpr_engine import get_anpr_engine
from ultralytics import YOLO

def test_real_video_anpr():
    print("====================================================")
    print("🎥 RUNNING REAL CCTV VIDEO FEED ANPR/OCR EXTRACTION")
    print("====================================================\n")

    anpr = get_anpr_engine()
    model = YOLO("yolov8n.pt")

    video_files = [f"camera_0{i}_feed.mp4" for i in range(1, 9)]
    available_videos = [v for v in video_files if os.path.exists(v)]

    print(f"Found {len(available_videos)} CCTV video files: {available_videos}\n")

    total_crops_tested = 0
    anpr_results = []

    for vid in available_videos[:4]: # Test first 4 feeds
        cap = cv2.VideoCapture(vid)
        cam_id = vid.split("_feed")[0]
        print(f"--- Processing {cam_id} ({vid}) ---")

        frame_idx = 0
        while cap.isOpened() and frame_idx < 60: # Sample first 60 frames
            ret, frame = cap.read()
            if not ret:
                break
            frame_idx += 1

            # Run YOLO vehicle detection
            results = model(frame, classes=[2, 3, 5, 7], conf=0.35, verbose=False)
            boxes = results[0].boxes

            if len(boxes) > 0:
                for idx, box in enumerate(boxes):
                    xyxy = box.xyxy[0].cpu().numpy().astype(int)
                    x1, y1, x2, y2 = xyxy
                    w = x2 - x1
                    h = y2 - y1

                    if w > 60 and h > 50: # Candidate vehicle
                        veh_crop = frame[y1:y2, x1:x2]
                        total_crops_tested += 1
                        
                        # Direct OCR execution test
                        ocr_res = anpr.process_vehicle_crop_direct(veh_crop, track_id=100 + idx, camera_id=cam_id)
                        if ocr_res and ocr_res.get('status') in ['VALID', 'LOW_CONFIDENCE', 'UNREAD']:
                            anpr_results.append({
                                'camera': cam_id,
                                'frame': frame_idx,
                                'vehicle_box': [int(x1), int(y1), int(x2), int(y2)],
                                'raw_text': ocr_res.get('raw_text'),
                                'normalized_plate': ocr_res.get('normalized_plate'),
                                'confidence': ocr_res.get('confidence'),
                                'status': ocr_res.get('status')
                            })
                        if len(anpr_results) >= 5:
                            break
            if len(anpr_results) >= 5:
                break
        cap.release()

    print(f"\nTotal vehicle crops analyzed: {total_crops_tested}")
    print(f"Total ANPR Extractions: {len(anpr_results)}\n")

    for idx, r in enumerate(anpr_results):
        print(f"[{idx+1}] Camera: {r['camera']} | Frame: {r['frame']} | Box: {r['vehicle_box']}")
        print(f"    Raw OCR: '{r['raw_text']}'")
        print(f"    Normalized: '{r['normalized_plate']}'")
        print(f"    Confidence: {r['confidence']:.2f}")
        print(f"    Status: {r['status']}\n")

    print("====================================================")
    print("ANPR CCTV VIDEO PIPELINE TEST COMPLETE")
    print("====================================================")

if __name__ == '__main__':
    test_real_video_anpr()
