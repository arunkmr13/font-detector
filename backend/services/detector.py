import numpy as np
import json
from pathlib import Path
from services.image_processor import preprocess_image
from schemas import DetectedFont

# Model paths — populated after you download/train and export the model
MODEL_PATH = Path(__file__).parent.parent / "ml" / "font_detector.onnx"
LABELS_PATH = Path(__file__).parent.parent / "ml" / "labels.json"

# Module-level model cache (loaded once on first call)
_session = None
_labels: list[str] = []


def _load_model():
    """Lazy-load the ONNX model — avoids slow startup on every worker spawn."""
    global _session, _labels

    if _session is not None:
        return

    try:
        import onnxruntime as ort

        if not MODEL_PATH.exists():
            raise FileNotFoundError(
                f"Model not found at {MODEL_PATH}. "
                "Run scripts/download_model.py to fetch the baseline model."
            )

        _session = ort.InferenceSession(
            str(MODEL_PATH),
            providers=["CPUExecutionProvider"],
        )

        with open(LABELS_PATH) as f:
            _labels = json.load(f)

    except ImportError:
        raise RuntimeError("onnxruntime is not installed. Run: pip install onnxruntime")


def detect_fonts(image_bytes: bytes, top_k: int = 5) -> list[DetectedFont]:
    """
    Run font detection on preprocessed image bytes.

    Returns the top_k most likely fonts with confidence scores.
    Falls back to a stub response if the model file isn't present yet
    (useful during early development before the model is trained).
    """
    # Development stub — remove once real model is in place
    if not MODEL_PATH.exists():
        return _stub_response()

    _load_model()

    # Preprocess
    processed = preprocess_image(image_bytes)

    # ONNX expects float32 input with shape (batch, channels, H, W)
    inp = processed.astype(np.float32) / 255.0
    inp = np.expand_dims(inp, axis=(0, 1))  # → (1, 1, 224, 224)

    # Run inference
    input_name = _session.get_inputs()[0].name
    logits = _session.run(None, {input_name: inp})[0][0]  # shape: (num_classes,)

    # Softmax → probabilities
    exp = np.exp(logits - logits.max())
    probs = exp / exp.sum()

    # Top-K
    top_indices = np.argsort(probs)[::-1][:top_k]

    results = []
    for idx in top_indices:
        if idx < len(_labels):
            results.append(DetectedFont(
                name=_labels[idx],
                confidence=round(float(probs[idx]), 4),
                category=None,       # enriched from DB in the route handler
                google_fonts_id=None,
                download_url=None,
                license_type=None,
                price_usd=None,
            ))

    return results


def _stub_response() -> list[DetectedFont]:
    """
    Returns plausible placeholder results while the model isn't trained yet.
    Lets you build and test the full API flow end-to-end without a real model.
    """
    stubs = [
        ("Helvetica Neue", 0.87),
        ("Inter", 0.07),
        ("Roboto", 0.03),
        ("Arial", 0.02),
        ("Gill Sans", 0.01),
    ]
    return [
        DetectedFont(
            name=name,
            confidence=conf,
            category="sans-serif",
            google_fonts_id=name.lower().replace(" ", "-") if name != "Helvetica Neue" else None,
            download_url=f"https://fonts.google.com/specimen/{name.replace(' ', '+')}" if name != "Helvetica Neue" else None,
            license_type="OFL" if name != "Helvetica Neue" else "commercial",
            price_usd=None if name != "Helvetica Neue" else 0.0,
        )
        for name, conf in stubs
    ]