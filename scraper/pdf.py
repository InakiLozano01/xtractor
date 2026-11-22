"""Render self-contained HTML to a PDF via a single persistent Playwright Chromium."""
from __future__ import annotations

import asyncio
import os
from contextlib import asynccontextmanager

from playwright.async_api import async_playwright

_lock = asyncio.Lock()
_pw = None
_browser = None


async def _stop_all():
    global _pw, _browser
    if _browser is not None:
        try:
            await _browser.close()
        except Exception:
            pass
        _browser = None
    if _pw is not None:
        try:
            await _pw.stop()
        except Exception:
            pass
        _pw = None


async def _get_browser():
    global _pw, _browser
    if _browser is not None and _browser.is_connected():
        return _browser
    await _stop_all()
    _pw = await async_playwright().start()
    try:
        _browser = await _pw.chromium.launch(args=["--no-sandbox", "--disable-gpu"])
    except Exception:
        try:
            await _pw.stop()
        except Exception:
            pass
        _pw = None
        raise
    return _browser


@asynccontextmanager
async def _page():
    browser = await _get_browser()
    ctx = await browser.new_context()
    page = await ctx.new_page()
    try:
        yield page
    finally:
        try:
            await ctx.close()
        except Exception:
            pass


async def render_pdf(html: str, output_path: str) -> str:
    """Render `html` (self-contained, file:// or data URLs for images) to `output_path`."""
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    async with _lock:
        async with _page() as page:
            await page.set_content(html, wait_until="networkidle", timeout=60_000)
            await page.emulate_media(media="print")
            await page.pdf(
                path=output_path,
                format="A4",
                print_background=True,
                margin={"top": "16mm", "bottom": "16mm", "left": "12mm", "right": "12mm"},
            )
    return output_path


async def shutdown():
    async with _lock:
        await _stop_all()
