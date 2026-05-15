import cv2
import numpy as np
from PIL import Image
import io


def preprocess_image(image_bytes: bytes) -> np.ndarray:
    """
    Prepare a raw uploaded image for font detection inference.

    Steps:
    1. Decode bytes → numpy array
    2. Convert to grayscale
    3. Denoise
    4. Adaptive threshold to isolate text
    5. Resize to model input size (224x224)
    """
    # Decode bytes to numpy array
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if img is None:
        raise ValueError("Could not decode image. Make sure it's a valid PNG/JPG/WEBP.")

    # Convert to grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Denoise
    denoised = cv2.fastNlMeansDenoising(gray, h=10)

    # Adaptive threshold — isolates text regions regardless of background colour
    thresh = cv2.adaptiveThreshold(
        denoised, 255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        11, 2
    )

    # Resize to standard model input
    resized = cv2.resize(thresh, (224, 224), interpolation=cv2.INTER_AREA)

    return resized


def extract_text_regions(image_bytes: bytes) -> list[np.ndarray]:
    """
    Find and crop individual text regions from an image.
    Returns a list of cropped region arrays ready for per-glyph analysis.
    """
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Find connected components (text blobs)
    _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(binary)

    regions = []
    for i in range(1, num_labels):  # skip background (label 0)
        x, y, w, h, area = stats[i]
        # Filter out noise — keep only reasonably sized text blobs
        if area > 100 and w > 10 and h > 10:
            region = gray[y:y+h, x:x+w]
            regions.append(region)

    return regions


def image_bytes_from_pil(pil_image: Image.Image, fmt: str = "PNG") -> bytes:
    buf = io.BytesIO()
    pil_image.save(buf, format=fmt)
    return buf.getvalue()