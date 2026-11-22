"""FastAPI sidecar: X/Twitter scraping (twscrape) + HTML→PDF (Playwright).

Internal-only service on the Docker network. Authenticated by a shared bearer
token (SCRAPER_TOKEN) set in .env.local. Never published to the host.
"""
from __future__ import annotations

import os
import json
import traceback
from typing import Any

from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from scrape import resolve_article_tweet_id, scrape_tweet
from pdf import render_pdf, shutdown

TOKEN = os.environ.get("SCRAPER_TOKEN", "")
ARTIFACTS_DIR = os.environ.get("ARTIFACTS_DIR", "/app/artifacts")


class ScrapeReq(BaseModel):
    tweet_id: int
    cookies: str
    article_id: str
    include_thread: bool = False


class ResolveArticleReq(BaseModel):
    article_id: str
    cookies: str


class PdfReq(BaseModel):
    html: str
    output_path: str  # relative to ARTIFACTS_DIR, e.g. "<article_id>/article.pdf"


def _auth(authorization: str | None):
    if not TOKEN:
        return  # token not configured (dev convenience); production sets it
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="missing bearer token")
    if authorization.removeprefix("Bearer ").strip() != TOKEN:
        raise HTTPException(status_code=403, detail="bad token")


app = FastAPI(title="xtractor-scraper", docs_url=None, redoc_url=None)


@app.get("/healthz")
async def healthz():
    return {"status": "ok"}


@app.post("/scrape")
async def scrape(req: ScrapeReq, authorization: str | None = Header(default=None)):
    _auth(authorization)
    try:
        result = await scrape_tweet(req.tweet_id, req.cookies, req.article_id, include_thread=req.include_thread)
        return result
    except Exception as e:  # noqa: BLE001 — surface the failure to the app
        return JSONResponse(
            status_code=502,
            content={"ok": False, "error": str(e), "trace": traceback.format_exc(limit=4)},
        )


@app.post("/resolve-article")
async def resolve_article(req: ResolveArticleReq, authorization: str | None = Header(default=None)):
    _auth(authorization)
    try:
        return await resolve_article_tweet_id(req.article_id, req.cookies)
    except Exception as e:  # noqa: BLE001 — surface the failure to the app
        return JSONResponse(
            status_code=502,
            content={"ok": False, "error": str(e), "trace": traceback.format_exc(limit=4)},
        )


@app.post("/pdf")
async def pdf(req: PdfReq, authorization: str | None = Header(default=None)):
    _auth(authorization)
    out = os.path.join(ARTIFACTS_DIR, req.output_path.lstrip("/"))
    if not os.path.realpath(out).startswith(os.path.realpath(ARTIFACTS_DIR) + os.sep):
        raise HTTPException(status_code=400, detail="path traversal")
    try:
        await render_pdf(req.html, out)
        return {"ok": True, "path": req.output_path}
    except Exception as e:  # noqa: BLE001
        return JSONResponse(
            status_code=502,
            content={"ok": False, "error": str(e), "trace": traceback.format_exc(limit=4)},
        )


@app.on_event("shutdown")
async def _shutdown():
    await shutdown()
