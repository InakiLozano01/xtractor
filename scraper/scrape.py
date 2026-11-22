"""twscrape wrapper for one-shot X/Twitter extraction."""
from __future__ import annotations

import os
import tempfile
from html import unescape
from datetime import datetime, timezone
from typing import Any

import httpx
from twscrape import API, gather
from twscrape.api import GQL_FEATURES, GQL_URL, QueueClient, encode_params

ARTIFACTS_DIR = os.environ.get("ARTIFACTS_DIR", "/app/artifacts")
THREAD_LIMIT = int(os.environ.get("THREAD_LIMIT", "80"))
TWEET_RESULT_OPS = [
    x
    for x in [
        os.environ.get("TWEET_RESULT_BY_REST_ID_OP"),
        "tCVRZ3WCvoj0BVO7BKnL-Q/TweetResultByRestId",
        "7xflPyRiUxGVbJd4uWmbfg/TweetResultByRestId",
    ]
    if x
]


def _model_to_dict(obj: Any) -> Any:
    if obj is None:
        return None
    if hasattr(obj, "dict") and callable(getattr(obj, "dict")):
        try:
            return obj.dict()
        except Exception:
            pass
    if hasattr(obj, "__dict__"):
        return {k: _model_to_dict(v) for k, v in obj.__dict__.items()}
    if isinstance(obj, list):
        return [_model_to_dict(x) for x in obj]
    if isinstance(obj, str):
        return unescape(obj)
    if isinstance(obj, (int, float, bool)):
        return obj
    return str(obj)


def _decode_text(obj: Any) -> Any:
    if isinstance(obj, str):
        return unescape(obj)
    if isinstance(obj, list):
        return [_decode_text(x) for x in obj]
    if isinstance(obj, dict):
        return {k: _decode_text(v) for k, v in obj.items()}
    return obj


async def _download_image(client: httpx.AsyncClient, url: str, dest: str) -> bool:
    try:
        r = await client.get(url, timeout=30.0)
        if r.status_code != 200:
            return False
        with open(dest, "wb") as f:
            f.write(r.content)
        return True
    except Exception:
        return False


def _collect_media_urls(tweet_dict: dict) -> list[dict]:
    out: list[dict] = []
    media = tweet_dict.get("media") or {}
    for i, p in enumerate(media.get("photos", [])):
        out.append({"kind": "photo", "url": p.get("url"), "alt": "photo"})
    for v in media.get("videos", []):
        out.append(
            {
                "kind": "video",
                "thumbnailUrl": v.get("thumbnailUrl"),
                "videoUrl": (v.get("variants") or [{}])[-1].get("url") if v.get("variants") else None,
                "alt": "video",
            }
        )
    for a in media.get("animated", []):
        out.append(
            {
                "kind": "animated",
                "thumbnailUrl": a.get("thumbnailUrl"),
                "videoUrl": a.get("videoUrl"),
                "alt": "gif",
            }
        )
    return out


def _tweet_author_id(tweet: Any) -> int | str | None:
    user = getattr(tweet, "user", None)
    return getattr(user, "id", None)


def _tweet_sort_key(tweet: Any) -> tuple[float, int]:
    dt = getattr(tweet, "date", None)
    if hasattr(dt, "timestamp"):
        ts = float(dt.timestamp())
    else:
        ts = 0.0
    return (ts, int(getattr(tweet, "id", 0) or 0))


def _same_author_thread_chain(main: Any, root: Any | None, tweets: list[Any]) -> list[Any]:
    """Return only the author's self-reply chain, excluding comments/replies."""
    author_id = _tweet_author_id(main)
    if author_id is None:
        return [main]

    root_author_id = _tweet_author_id(root) if root is not None else None
    start = root if root is not None and root_author_id == author_id else main
    start_id = int(getattr(start, "id"))

    candidates: dict[int, Any] = {}
    for tweet in [root, main, *tweets]:
        if tweet is None:
            continue
        tweet_id = getattr(tweet, "id", None)
        if tweet_id is None or _tweet_author_id(tweet) != author_id:
            continue
        candidates[int(tweet_id)] = tweet

    candidates[start_id] = start
    included = {start_id}
    changed = True
    while changed:
        changed = False
        for tweet_id, tweet in candidates.items():
            if tweet_id in included:
                continue
            parent_id = getattr(tweet, "inReplyToTweetId", None)
            if parent_id is not None and int(parent_id) in included:
                included.add(tweet_id)
                changed = True

    return sorted((candidates[tweet_id] for tweet_id in included), key=_tweet_sort_key)


def _link_matches_article(tweet_dict: dict, article_id: str) -> bool:
    target = f"/i/article/{article_id}"
    for link in tweet_dict.get("links") or []:
        for key in ("url", "tcourl", "text"):
            if target in str(link.get(key) or ""):
                return True
    return target in str(tweet_dict.get("rawContent") or "")


def _image_from_media_entity(entity: dict | None) -> str | None:
    media_info = (entity or {}).get("media_info") or {}
    return media_info.get("original_img_url") or media_info.get("preview_image_url")


def _article_url(article_id: str | None) -> str | None:
    return f"https://x.com/i/article/{article_id}" if article_id else None


def _iso_from_secs(secs: int | None) -> str | None:
    if not secs:
        return None
    return datetime.fromtimestamp(secs, tz=timezone.utc).isoformat()


async def _tweet_result_by_rest_id(api: API, tweet_id: int) -> dict | None:
    features = {
        **GQL_FEATURES,
        "longform_notetweets_consumption_enabled": True,
        "responsive_web_twitter_article_tweet_consumption_enabled": True,
        "longform_notetweets_rich_text_read_enabled": True,
        "longform_notetweets_inline_media_enabled": True,
        "articles_preview_enabled": True,
        "responsive_web_graphql_exclude_directive_enabled": True,
        "verified_phone_label_enabled": False,
    }
    params = {
        "variables": {
            "tweetId": str(tweet_id),
            "withCommunity": False,
            "includePromotedContent": False,
            "withVoice": False,
        },
        "features": features,
        "fieldToggles": {
            "withArticleRichContentState": True,
            "withArticlePlainText": True,
        },
    }
    last_error: Exception | None = None
    for op in TWEET_RESULT_OPS:
        try:
            async with QueueClient(api.pool, "TweetResultByRestId", api.debug, proxy=api.proxy) as client:
                rep = await client.get(f"{GQL_URL}/{op}", params=encode_params(params))
            if not rep:
                continue
            return rep.json().get("data", {}).get("tweetResult", {}).get("result")
        except Exception as exc:
            last_error = exc
            continue
    if last_error:
        raise last_error
    return None


def _extract_article(result: dict | None, main_dict: dict) -> dict | None:
    article = (
        (result or {})
        .get("article", {})
        .get("article_results", {})
        .get("result")
    )
    if not isinstance(article, dict):
        return None

    article_id = article.get("rest_id")
    blocks = _decode_text((article.get("content_state") or {}).get("blocks") or [])
    metadata = article.get("metadata") or {}
    cover = article.get("cover_media") or {}
    cover_url = _image_from_media_entity(cover)
    media: list[dict] = []
    if cover_url:
        media.append({"kind": "article-cover", "url": cover_url, "alt": article.get("title") or "cover image"})

    for i, entity in enumerate(article.get("media_entities") or []):
        src = _image_from_media_entity(entity)
        if src and src not in {m["url"] for m in media}:
            media.append({"kind": "article-image", "url": src, "alt": f"article image {i + 1}"})

    user = main_dict.get("user") or {}
    return {
        "id": str(article_id) if article_id else None,
        "url": _article_url(str(article_id)) if article_id else main_dict.get("url"),
        "title": unescape(article.get("title") or ""),
        "previewText": unescape(article.get("preview_text") or ""),
        "plainText": unescape(article.get("plain_text") or ""),
        "blocks": blocks,
        "publishedAt": _iso_from_secs(metadata.get("first_published_at_secs")),
        "coverImage": media[0] if media else None,
        "media": media,
        "author": {
            "username": user.get("username"),
            "displayname": user.get("displayname"),
            "profileImageUrl": user.get("profileImageUrl"),
        },
        "sourceTweetUrl": main_dict.get("url"),
    }


async def resolve_article_tweet_id(article_id: str, cookie_str: str) -> dict:
    fd, db_path = tempfile.mkstemp(suffix=".db")
    os.close(fd)

    api = API(db_path)
    try:
        await api.pool.add_account_cookies("session", cookie_str)
        tweets = await gather(api.search(f"url:x.com/i/article/{article_id}", limit=10))
        for tweet in tweets:
            tweet_dict = _model_to_dict(tweet)
            if _link_matches_article(tweet_dict, article_id):
                return {
                    "ok": True,
                    "tweetId": str(tweet.id),
                    "url": tweet_dict.get("url"),
                }
        return {"ok": False, "error": "could not resolve X Article URL to a source post"}
    finally:
        try:
            os.unlink(db_path)
        except OSError:
            pass


async def scrape_tweet(tweet_id: int, cookie_str: str, article_id: str, include_thread: bool = False) -> dict:
    img_dir = os.path.join(ARTIFACTS_DIR, article_id, "images")
    os.makedirs(img_dir, exist_ok=True)

    fd, db_path = tempfile.mkstemp(suffix=".db")
    os.close(fd)

    api = API(db_path)
    try:
        await api.pool.add_account_cookies("session", cookie_str)

        main = await api.tweet_details(tweet_id)
        if main is None:
            raise RuntimeError("tweet not found or account unable to fetch it")

        main_dict = _model_to_dict(main)
        article_result = await _tweet_result_by_rest_id(api, tweet_id)
        x_article = _extract_article(article_result, main_dict)
        thread_models: list[Any] = [main]

        if include_thread:
            root_id = int(getattr(main, "conversationId", None) or tweet_id)
            root = main if root_id == int(tweet_id) else await api.tweet_details(root_id)
            thread_candidates = await gather(api.tweet_thread(root_id, limit=THREAD_LIMIT))
            thread_models = _same_author_thread_chain(main, root, thread_candidates)

        thread_dicts = [_model_to_dict(tweet) for tweet in thread_models] if include_thread else []
        tweet_media_sources = thread_dicts if include_thread else [main_dict]

        local_images: list[dict] = []
        async with httpx.AsyncClient(follow_redirects=True) as client:
            for ti, tweet_dict in enumerate(tweet_media_sources):
                for mi, m in enumerate(_collect_media_urls(tweet_dict)):
                    src = m.get("url") or m.get("thumbnailUrl")
                    if not src:
                        continue
                    kind = m["kind"]
                    fname = f"{kind}-t{ti}-{mi}.jpg"
                    dest = os.path.join(img_dir, fname)
                    ok = await _download_image(client, src, dest)
                    local_images.append(
                        {
                            "tweetIndex": ti,
                            "kind": kind,
                            "remoteUrl": src,
                            "localPath": f"images/{fname}" if ok else None,
                            "videoUrl": m.get("videoUrl"),
                            "alt": m.get("alt"),
                        }
                    )

            for mi, m in enumerate((x_article or {}).get("media") or []):
                src = m.get("url")
                if not src:
                    continue
                kind = m["kind"]
                fname = f"{kind}-{mi}.jpg"
                dest = os.path.join(img_dir, fname)
                ok = await _download_image(client, src, dest)
                local_images.append(
                    {
                        "tweetIndex": -1,
                        "kind": kind,
                        "remoteUrl": src,
                        "localPath": f"images/{fname}" if ok else None,
                        "videoUrl": None,
                        "alt": m.get("alt"),
                    }
                )

        raw_content = (x_article or {}).get("plainText")
        if not raw_content:
            raw_content = "\n\n".join(str(t.get("rawContent") or "") for t in thread_dicts).strip() if include_thread else main_dict.get("rawContent")

        return {
            "ok": True,
            "main": main_dict,
            "thread": thread_dicts,
            "threadRequested": include_thread,
            "threadCount": len(thread_dicts) if include_thread else 1,
            "threadRootTweetId": str(thread_models[0].id) if thread_models else str(main.id),
            "xArticle": x_article,
            "images": local_images,
            "author": (main_dict.get("user") or {}).get("username"),
            "tweetId": str(main.id),
            "url": (x_article or {}).get("url") or (thread_dicts[0].get("url") if thread_dicts else main_dict.get("url")),
            "date": (main_dict.get("date") or {}).get("$datetime") if isinstance(main_dict.get("date"), dict) else main_dict.get("date"),
            "rawContent": raw_content,
        }
    finally:
        try:
            os.unlink(db_path)
        except OSError:
            pass
