import os
import cv2
import numpy as np
from anpr_engine import anpr_engine, RE_SL_PROVINCIAL, RE_SL_STANDARD, RE_SL_NUMERIC

print("==================================================")
print("TESTING ANPR ENGINE - SRI LANKAN NORMALIZATION")
print("==================================================")

test_cases = [
    ("WP CAB-4521", 0.95, "WP CAB-4521", "VALID"),
    ("SP KY-3390", 0.92, "SP KY-3390", "VALID"),
    ("CP AB-1234", 0.88, "CP AB-1234", "VALID"),
    ("NW KY-9080", 0.90, "NW KY-9080", "VALID"),
    ("WP CBM4821", 0.85, "WP CBM-4821", "VALID"),
    ("WPCAB4521", 0.82, "WP CAB-4521", "VALID"),
    ("WP CAB-452I", 0.78, "WP CAB-4521", "VALID"), # Positional disambiguation (I -> 1)
    ("WP 0AB-4521", 0.75, "WP OAB-4521", "VALID"), # Positional disambiguation (0 -> O)
    ("19-4521", 0.85, "19-4521", "VALID"),
    ("65-1234", 0.85, "65-1234", "VALID"),
    ("BLURRY_GARBAGE_123", 0.30, None, "UNREAD"),
    ("", 0.0, None, "UNREAD")
]

passed = 0
for raw, conf, expected_plate, expected_status in test_cases:
    norm_plate, status = anpr_engine.normalize_and_validate_plate(raw, conf)
    print(f"Input: '{raw}' ({conf}) -> Output: '{norm_plate}' [{status}]")
    if expected_plate is not None:
        assert norm_plate == expected_plate, f"Expected {expected_plate}, got {norm_plate}"
    assert status == expected_status, f"Expected {expected_status}, got {status}"
    passed += 1

print(f"\n[PASS] All {passed} Normalization test cases PASSED!")

# Test Multi-frame Consensus
print("\n--- Testing Multi-Frame Track Consensus ---")
track_id = 42
anpr_engine.track_data[track_id] = {
    'cam_id': 'cam_01',
    'last_ocr_frame': 0,
    'observations': [],
    'best_plate': None,
    'best_confidence': 0.0,
    'best_status': 'UNREAD',
    'best_crop': None
}

t_info = anpr_engine.track_data[track_id]
t_info['observations'].append({'normalized_plate': 'WP CAB-4521', 'confidence': 0.65, 'status': 'VALID', 'raw_text': 'WP CAB-4521'})
t_info['observations'].append({'normalized_plate': 'WP CAB-4521', 'confidence': 0.90, 'status': 'VALID', 'raw_text': 'WP CAB-4521'})
t_info['observations'].append({'normalized_plate': 'WP CAB-452I', 'confidence': 0.55, 'status': 'LOW_CONFIDENCE', 'raw_text': 'WP CAB-452I'})
anpr_engine._update_consensus(t_info)

res = anpr_engine.get_track_plate(track_id)
print("Track 42 Consensus Result:", res)
assert res['plate'] == 'WP CAB-4521'
assert res['status'] == 'VALID'
assert res['confidence'] > 0.70
print("[PASS] Multi-frame consensus PASSED!")
