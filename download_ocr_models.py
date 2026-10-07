import os
import sys

os.environ["PYTHONIOENCODING"] = "utf-8"

try:
    import easyocr
    print("Initializing EasyOCR with verbose=False...")
    reader = easyocr.Reader(['en'], gpu=False, verbose=False)
    print("✅ EasyOCR Models Downloaded and Ready!")
except Exception as e:
    print(f"❌ Error: {e}")
    sys.exit(1)
