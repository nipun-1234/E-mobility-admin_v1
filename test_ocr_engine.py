import cv2
import numpy as np
import easyocr
import re

print("Initializing EasyOCR reader...")
reader = easyocr.Reader(['en'], gpu=False, verbose=False)

# Generate a synthetic high-contrast Sri Lankan plate image for verification
# Dimensions: 520x110 (Standard Sri Lankan plate size ratio)
plate_img = np.ones((110, 520, 3), dtype=np.uint8) * 240
# Add yellow plate background
plate_img[:, :] = [50, 215, 255] # BGR Yellow
# Add black border
cv2.rectangle(plate_img, (5, 5), (515, 105), (0, 0, 0), 4)
# Add text
cv2.putText(plate_img, "WP CAB-4521", (40, 75), cv2.FONT_HERSHEY_DUPLEX, 2.0, (0, 0, 0), 4, cv2.LINE_AA)

# Run OCR
results = reader.readtext(plate_img)
print("Raw OCR Results:", results)

if results:
    for bbox, text, conf in results:
        print(f"Detected Text: '{text}' (Confidence: {conf:.2f})")
else:
    print("No text detected.")
