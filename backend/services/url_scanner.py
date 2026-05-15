from playwright.async_api import async_playwright
from schemas import ScannedFont


async def scan_url_for_fonts(url: str) -> list[ScannedFont]:
    """
    Render a webpage headlessly and extract all font families in use.

    Strategy:
    1. Load the page with Playwright (headless Chromium)
    2. Query computed styles on every visible text element
    3. Deduplicate and count usage per font family
    4. Check if each font is a web font (loaded from external URL)
    """
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        # Intercept font requests to identify web font source URLs
        web_font_urls: dict[str, str] = {}

        async def capture_font_request(request):
            url_lower = request.url.lower()
            if any(ext in url_lower for ext in [".woff", ".woff2", ".ttf", ".otf"]):
                # Try to associate the filename with a font name
                filename = request.url.split("/")[-1].split(".")[0].replace("-", " ").replace("_", " ")
                web_font_urls[filename.lower()] = request.url

        page.on("request", capture_font_request)

        try:
            await page.goto(url, wait_until="networkidle", timeout=15000)
        except Exception as e:
            await browser.close()
            raise ValueError(f"Could not load URL: {str(e)}")

        # Extract font usage from all text elements via JS
        font_data: list[dict] = await page.evaluate("""
            () => {
                const fontMap = {};
                const elements = document.querySelectorAll('*');

                elements.forEach(el => {
                    if (!el.textContent.trim()) return;

                    const style = window.getComputedStyle(el);
                    const fontFamily = style.fontFamily;

                    if (!fontFamily) return;

                    // Get primary font (first in the stack)
                    const primaryFont = fontFamily.split(',')[0]
                        .trim()
                        .replace(/['"]/g, '');

                    if (!fontMap[primaryFont]) {
                        fontMap[primaryFont] = {
                            name: primaryFont,
                            css_value: fontFamily,
                            element_count: 0,
                        };
                    }
                    fontMap[primaryFont].element_count += 1;
                });

                return Object.values(fontMap);
            }
        """)

        await browser.close()

        # Build response objects
        results = []
        for item in font_data:
            name_lower = item["name"].lower()
            source = web_font_urls.get(name_lower)
            is_web_font = source is not None or "fonts.gstatic" in str(source or "")

            results.append(ScannedFont(
                name=item["name"],
                css_value=item["css_value"],
                element_count=item["element_count"],
                is_web_font=is_web_font,
                source_url=source,
            ))

        # Sort by usage count descending
        results.sort(key=lambda f: f.element_count, reverse=True)

        return results