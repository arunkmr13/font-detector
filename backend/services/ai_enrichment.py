import json
import google.generativeai as genai
from config import get_settings
from schemas import PairingResponse, FontPairing

settings = get_settings()

# Configure Gemini once at module load
genai.configure(api_key=settings.gemini_api_key)
model = genai.GenerativeModel("gemini-1.5-flash")  # free tier model


async def get_font_pairings(font_name: str, use_case: str | None = None) -> PairingResponse:
    """
    Ask Gemini to suggest font pairings for a detected font.
    Returns structured pairing data parsed from JSON.
    """
    use_case_str = f" for a {use_case} context" if use_case else ""

    prompt = f"""You are a professional typographer and type designer.

A designer is using the font "{font_name}"{use_case_str}.
Suggest 3 complementary fonts that pair well with it.

Respond ONLY with a valid JSON object in this exact format — no markdown, no explanation:
{{
  "pairings": [
    {{
      "role": "body",
      "font_name": "Font Name Here",
      "rationale": "One sentence explaining why this pairing works."
    }},
    {{
      "role": "accent",
      "font_name": "Font Name Here",
      "rationale": "One sentence explaining why this pairing works."
    }},
    {{
      "role": "heading",
      "font_name": "Font Name Here",
      "rationale": "One sentence explaining why this pairing works."
    }}
  ],
  "overall_rationale": "One sentence describing the overall typographic system."
}}

Rules:
- Prefer freely available fonts (Google Fonts, system fonts)
- Each font must actually exist
- Roles: body, heading, accent, or code"""

    try:
        response = model.generate_content(prompt)
        raw = response.text.strip()

        # Strip markdown fences if present
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]

        data = json.loads(raw)

        return PairingResponse(
            base_font=font_name,
            pairings=[FontPairing(**p) for p in data["pairings"]],
            overall_rationale=data["overall_rationale"],
        )

    except json.JSONDecodeError as e:
        raise ValueError(f"Gemini returned invalid JSON: {e}")
    except Exception as e:
        raise RuntimeError(f"Gemini API error: {e}")


async def analyze_font_mood(font_name: str) -> dict:
    """
    Return descriptive metadata about a font's personality and best use cases.
    Used to enrich detection results.
    """
    prompt = f"""Describe the font "{font_name}" as a typographer would.

Respond ONLY with valid JSON — no markdown:
{{
  "mood": ["adjective1", "adjective2", "adjective3"],
  "best_for": ["use case 1", "use case 2"],
  "avoid_for": ["bad use case 1"],
  "era": "decade or design movement this font belongs to",
  "similar_fonts": ["Font A", "Font B"]
}}"""

    try:
        response = model.generate_content(prompt)
        raw = response.text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        return json.loads(raw)
    except Exception:
        return {}