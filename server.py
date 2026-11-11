#!/usr/bin/env python3
"""
LumaAnime — Современный аниме-портал и онлайн-кинотеатр
Backend API & Proxy Server:
- Полный каталог всех аниме на русском (Shikimori API v1)
- Обогащение HD-постерами, широкоформатными баннерами и живым счётчиком серий (AniList GraphQL API)
- Полный список всех вышедших серий без лимитов (1..1180+ для Ван-Пис, Наруто, Блич, Детектив Конан и др.)
- Синхронизация в реальном времени (кнопка принудительного обновления + точный таймер до выхода следующей серии)
- Подбор источников видео и озвучек (AniLibria API v1 HLS 1080p/720p/480p + Fandub студии + Трейлеры + Мульти-балансер)
"""

import json
import os
import sys
import time
import socket
import threading
import base64
import re
import math
import urllib.parse
import urllib.request
import urllib.error
from concurrent.futures import ThreadPoolExecutor
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass
if sys.stderr and hasattr(sys.stderr, 'reconfigure'):
    try:
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

PORT = int(os.environ.get("PORT", 8080))
LUMA_DATA_DIR = os.environ.get("LUMA_DATA_DIR", os.path.join(os.environ.get("LOCALAPPDATA", ""), "Luma", "AnimeData"))
try:
    os.makedirs(LUMA_DATA_DIR, exist_ok=True)
except Exception:
    pass
STATIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")

USER_AGENT = "LumaAnime/3.0 (Modern Slate-Violet Anime Platform)"

# In-memory cache: { key: (expire_ts, data) }
_CACHE = {}
_CACHE_LOCK = threading.Lock()

# Dedicated artwork & live episode metadata cache:
# { mal_id: {"poster": url, "banner": url, "color": hex, "episodes": int, "next_airing": dict, "streaming_eps": list} }
_POSTER_CACHE = {}


def cache_get(key):
    with _CACHE_LOCK:
        entry = _CACHE.get(key)
        if not entry:
            return None
        expire_ts, data = entry
        if time.time() > expire_ts:
            del _CACHE[key]
            return None
        return data


def cache_set(key, data, ttl=300):
    with _CACHE_LOCK:
        _CACHE[key] = (time.time() + ttl, data)


def cache_delete_prefix(prefix):
    with _CACHE_LOCK:
        keys = [k for k in _CACHE.keys() if k.startswith(prefix)]
        for k in keys:
            del _CACHE[k]


def http_get_json(url, headers=None, timeout=10):
    req_headers = {"User-Agent": USER_AGENT, "Accept": "application/json"}
    if headers:
        req_headers.update(headers)
    req = urllib.request.Request(url, headers=req_headers)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except Exception:
        return None


def http_post_json(url, payload, headers=None, timeout=10):
    req_headers = {
        "User-Agent": USER_AGENT,
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    if headers:
        req_headers.update(headers)
    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=body, headers=req_headers, method="POST")
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


def enrich_with_anilist_artwork(items, force_refresh=False):
    """
    Enriches Shikimori anime objects with high-resolution posters, wide banners,
    and real-time airing episode numbers from AniList GraphQL API.
    """
    if not items:
        return items

    anime_objs = []
    for item in items:
        if isinstance(item, dict):
            if "anime" in item and isinstance(item["anime"], dict):
                anime_objs.append(item["anime"])
            elif "id" in item and item.get("id"):
                anime_objs.append(item)

    if not anime_objs:
        return items

    missing_ids = []
    for a in anime_objs:
        if not isinstance(a, dict):
            continue
        aid = a.get("id")
        if aid and (force_refresh or int(aid) not in _POSTER_CACHE):
            missing_ids.append(int(aid))

    if missing_ids:
        unique_ids = list(set(missing_ids))[:50]
        query = """
        query ($ids: [Int]) {
          Page(page: 1, perPage: 50) {
            media(idMal_in: $ids, type: ANIME) {
              idMal
              episodes
              nextAiringEpisode {
                episode
                airingAt
                timeUntilAiring
              }
              coverImage {
                extraLarge
                large
                color
              }
              bannerImage
              streamingEpisodes {
                title
                thumbnail
              }
            }
          }
        }
        """
        try:
            res = http_post_json(
                "https://graphql.anilist.co",
                {"query": query, "variables": {"ids": unique_ids}},
                timeout=7,
            )
            media_list = (
                res.get("data", {}).get("Page", {}).get("media", []) or []
            )
            for m in media_list:
                mal_id = m.get("idMal")
                if mal_id:
                    cover = m.get("coverImage") or {}
                    _POSTER_CACHE[int(mal_id)] = {
                        "poster": cover.get("extraLarge") or cover.get("large"),
                        "poster_medium": cover.get("large"),
                        "banner": m.get("bannerImage"),
                        "color": cover.get("color"),
                        "al_episodes": m.get("episodes"),
                        "next_airing": m.get("nextAiringEpisode"),
                        "streaming_eps": m.get("streamingEpisodes") or [],
                    }
        except Exception:
            pass

    for a in anime_objs:
        if not isinstance(a, dict):
            continue
        aid = a.get("id")
        img = a.get("image") or {}
        orig = img.get("original") or ""
        prev = img.get("preview") or ""

        shiki_poster = (
            f"https://shikimori.one{orig}"
            if orig and "missing" not in orig
            else None
        )
        shiki_preview = (
            f"https://shikimori.one{prev}"
            if prev and "missing" not in prev
            else None
        )

        al_art = _POSTER_CACHE.get(int(aid)) if aid else None
        al_poster = al_art.get("poster") if al_art else None
        al_banner = al_art.get("banner") if al_art else None

        a["poster_url"] = al_poster or shiki_poster or shiki_preview or ""
        a["poster_preview"] = (
            shiki_preview
            or (al_art.get("poster_medium") if al_art else None)
            or a["poster_url"]
        )
        a["banner_url"] = al_banner or a["poster_url"]
        a["accent_color"] = (al_art.get("color") if al_art else None) or "#8b5cf6"

        # Calculate accurate real-time aired episodes count
        shiki_total = int(a.get("episodes") or 0)
        shiki_aired = int(a.get("episodes_aired") or 0)
        al_total = int((al_art.get("al_episodes") if al_art else 0) or 0)
        next_air = al_art.get("next_airing") if al_art else None
        al_aired_from_next = (
            int(next_air["episode"]) - 1
            if next_air and next_air.get("episode") and int(next_air["episode"]) > 1
            else 0
        )

        real_aired = max(shiki_aired, al_aired_from_next, shiki_total if a.get("status") == "released" else 0, al_total if a.get("status") == "released" else 0)
        real_total = max(shiki_total, al_total)

        a["real_episodes_aired"] = real_aired if real_aired > 0 else (real_total if real_total > 0 else 1)
        a["real_episodes_total"] = real_total
        if next_air:
            a["next_airing"] = next_air

    return items


def normalize_title(s):
    if not s:
        return ""
    return " ".join(re.sub(r"[^\w\s]", " ", s.lower()).split())


def rerank_search_results(items, query):
    if not items or not query:
        return items
    q_norm = normalize_title(query)

    def rank_score(item):
        name_en = item.get("name") or ""
        name_ru = item.get("russian") or ""
        en_norm = normalize_title(name_en)
        ru_norm = normalize_title(name_ru)
        kind = (item.get("kind") or "").lower()
        score = float(item.get("score") or 0)
        eps = int(item.get("episodes") or 0)

        pts = 0
        # 1. Format: TV series is the primary format for the main show
        if kind == "tv":
            pts += 240
        elif kind == "movie":
            pts += 60
        elif kind in ["special", "tv_special"]:
            pts += 15
        elif kind == "music":
            pts -= 500

        # 2. Score & episode count
        pts += score * 22
        if eps > 1:
            pts += min(eps, 50) * 2

        # 3. Exact match on normalized title
        if ru_norm == q_norm or en_norm == q_norm:
            pts += 450
        elif ru_norm.startswith(q_norm) or en_norm.startswith(q_norm):
            pts += 180
        elif q_norm in ru_norm or q_norm in en_norm:
            pts += 100

        # 4. Spin-off / recap / commercial penalty
        spin_off_markers = [
            "special", "спешл", "movie", "фильм", "ova", "recap", "рекап",
            "snickers", "chibi", "тиби", "клип", "реклама", "промо"
        ]
        for m in spin_off_markers:
            if m in name_en.lower() or m in name_ru.lower():
                pts -= 90

        # Penalty for secondary/later season numbers and parts when root title is sought
        part_markers = [
            "part 2", "part 3", "part 4", "part 5", "part 6",
            "часть 2", "часть 3", "часть 4", "часть 5", "часть 6"
        ]
        for p in part_markers:
            if p in name_en.lower() or p in name_ru.lower():
                if p not in q_norm:
                    pts -= 140

        season_markers = [
            "season 2", "2 сезон", "season 3", "3 сезон", "season 4", "4 сезон",
            "2nd season", "3rd season", "финал", "final"
        ]
        for m in season_markers:
            if m in name_en.lower() or m in name_ru.lower():
                if m not in q_norm:
                    pts -= 100

        # Preference for cleaner, canonical root title length
        pts += max(0, 40 - len(name_ru))

        return pts

    return sorted(items, key=rank_score, reverse=True)


def fetch_shikimori_animes(params_dict, force_refresh=False):
    """Fetch anime list from Shikimori API with caching, search reranking & artwork enrichment."""
    clean_params = {k: v for k, v in params_dict.items() if v is not None and v != ""}
    if "censored" not in clean_params:
        clean_params["censored"] = "true"

    search_query = clean_params.get("search")
    user_limit = int(clean_params.get("limit") or 24)

    # For search queries, fetch wider pool (30) from Shikimori so main anime isn't cut off by random specials
    req_params = dict(clean_params)
    if search_query:
        req_params["limit"] = "30"

    query_str = urllib.parse.urlencode(req_params)
    cache_key = f"shiki_animes_v2:{query_str}"

    if not force_refresh:
        cached = cache_get(cache_key)
        if cached is not None:
            return cached

    url = f"https://shikimori.one/api/animes?{query_str}"
    data = http_get_json(url, timeout=10)
    if isinstance(data, list):
        if search_query:
            data = rerank_search_results(data, search_query)
            data = data[:user_limit]
        enrich_with_anilist_artwork(data, force_refresh=force_refresh)
    cache_set(cache_key, data, ttl=300)
    return data


def parse_episode_range(s):
    if not s:
        return 1, 99999
    s = str(s).strip()
    m = re.match(r'^(\d+)\s*[-~–—]\s*(\d+)$', s)
    if m:
        return int(m.group(1)), int(m.group(2))
    m2 = re.match(r'^(\d+)', s)
    if m2:
        return 1, int(m2.group(1))
    return 1, 99999


def fetch_kitsu_episode_titles(anime_id, total_episodes=0):
    """
    Fetch comprehensive canonical episode titles from Kitsu API using MAL ID mapping.
    Caches results persistently on disk to ensure 0ms subsequent loads.
    """
    if not anime_id:
        return {}

    cache_file = os.path.join(LUMA_DATA_DIR, "cache", "episodes", f"titles_{anime_id}.json")
    try:
        if os.path.exists(cache_file):
            with open(cache_file, "r", encoding="utf-8") as f:
                cached = json.load(f)
                if isinstance(cached, dict) and len(cached) > 0:
                    return {int(k): v for k, v in cached.items()}
    except Exception:
        pass

    # Map MAL ID to Kitsu ID
    try:
        mapping_url = (
            f"https://kitsu.io/api/edge/mappings?"
            f"filter[external_site]=myanimelist/anime&filter[external_id]={anime_id}&include=item"
        )
        mapping_res = http_get_json(
            mapping_url,
            headers={"Accept": "application/vnd.api+json"},
            timeout=5,
        )
        if not mapping_res or not isinstance(mapping_res, dict):
            return {}

        included = mapping_res.get("included") or []
        kitsu_id = None
        for inc in included:
            if inc.get("type") == "anime":
                kitsu_id = inc.get("id")
                break
        if not kitsu_id and included:
            kitsu_id = included[0].get("id")

        if not kitsu_id:
            return {}
    except Exception:
        return {}

    req_episodes = max(total_episodes or 24, 24)
    num_pages = min(max(1, math.ceil(req_episodes / 20)), 70)
    offsets = [i * 20 for i in range(num_pages)]

    def fetch_page(offset):
        page_url = (
            f"https://kitsu.io/api/edge/anime/{kitsu_id}/episodes?"
            f"page[limit]=20&page[offset]={offset}&fields[episodes]=number,canonicalTitle,titles"
        )
        try:
            req = urllib.request.Request(
                page_url,
                headers={
                    "User-Agent": USER_AGENT,
                    "Accept": "application/vnd.api+json",
                },
            )
            with urllib.request.urlopen(req, timeout=5) as resp:
                data = json.loads(resp.read().decode("utf-8"))
            eps = {}
            for item in data.get("data", []):
                attrs = item.get("attributes", {})
                num = attrs.get("number")
                title = (
                    attrs.get("canonicalTitle")
                    or (attrs.get("titles", {}) or {}).get("en_us")
                    or (attrs.get("titles", {}) or {}).get("en_jp")
                    or (attrs.get("titles", {}) or {}).get("en")
                )
                if num and title:
                    eps[int(num)] = title.strip()
            return eps
        except Exception:
            return {}

    all_titles = {}
    with ThreadPoolExecutor(max_workers=min(num_pages, 20)) as executor:
        results = list(executor.map(fetch_page, offsets))
        for page_dict in results:
            all_titles.update(page_dict)

    if all_titles:
        try:
            os.makedirs(os.path.dirname(cache_file), exist_ok=True)
            with open(cache_file, "w", encoding="utf-8") as f:
                json.dump(all_titles, f, ensure_ascii=False)
        except Exception:
            pass

    return all_titles


def extract_anime_seasons(anime_id):
    """
    Extract clean chronological TV anime seasons for a franchise.
    Filters out commercials, music clips, and comedy chibi spin-offs.
    """
    if not anime_id:
        return []
    url = f"https://shikimori.one/api/animes/{anime_id}/franchise"
    data = http_get_json(url, timeout=6)
    if not isinstance(data, dict):
        return []
    nodes = data.get("nodes") or []
    if not nodes:
        return []

    curr_id = int(anime_id)
    tv_nodes = []
    for n in nodes:
        kind = (n.get("kind") or "").lower()
        name = (n.get("name") or "").lower()
        if any(b in kind for b in ["клип", "реклама", "промо", "спецвыпуск", "picture drama", "фильм", "movie"]):
            continue
        if any(b in name for b in ["recap", "рекап", "chibi", "тиби", "чиби", "snickers", "сказочн", "титаны средней школы", "junior high"]):
            continue
        if any(k in kind for k in ["tv сериал", "tv", "сериал"]):
            tv_nodes.append(n)

    # Ensure current anime is present in case of unexpected metadata kind
    if not any(n.get("id") == curr_id for n in tv_nodes):
        for n in nodes:
            if n.get("id") == curr_id:
                tv_nodes.append(n)
                break

    tv_nodes.sort(key=lambda x: (x.get("year") or 9999, x.get("id")))

    if len(tv_nodes) <= 1:
        return []

    seasons = []
    for idx, node in enumerate(tv_nodes, start=1):
        seasons.append({
            "season_number": idx,
            "id": node.get("id"),
            "name": node.get("name"),
            "year": node.get("year"),
            "is_current": node.get("id") == curr_id,
        })
    return seasons


def fetch_anime_full_details(anime_id, force_refresh=False):
    """
    Fetch complete details, FULL episode list (every single episode 1..N merged with AniLibria HLS streams),
    real-time airing countdown, similar titles, related franchise, characters, and voiceover studios.
    """
    cache_key = f"anime_full_v5:{anime_id}"
    if not force_refresh:
        cached = cache_get(cache_key)
        if cached is not None:
            return cached

    # 1. Main details from Shikimori with automatic retry and resilient fallback
    details = http_get_json(f"https://shikimori.one/api/animes/{anime_id}", timeout=8)
    if not details or not isinstance(details, dict) or not details.get("id"):
        time.sleep(0.3)
        details = http_get_json(f"https://shikimori.me/api/animes/{anime_id}", timeout=8)
    if not details or not isinstance(details, dict) or not details.get("id"):
        time.sleep(0.3)
        details = http_get_json(f"https://shikimori.one/api/animes/{anime_id}", timeout=8)
    if not details or not isinstance(details, dict) or not details.get("id"):
        cached = cache_get(cache_key)
        if cached:
            return cached
        details = {
            "id": int(anime_id),
            "name": f"Anime #{anime_id}",
            "russian": f"Аниме #{anime_id}",
            "episodes": 12,
            "episodes_aired": 12,
            "status": "released",
            "kind": "tv",
            "score": "8.0",
        }
    enrich_with_anilist_artwork([details], force_refresh=force_refresh)

    # 2. Fetch similar, related, roles, AniLibria, Kodik dubs, Kitsu titles, and seasons in parallel threads
    result_holder = {
        "similar": [],
        "related": [],
        "roles": [],
        "anilibria": None,
        "kodik_dubs": [],
        "kitsu_titles": {},
        "seasons": [],
    }

    def get_kodik_dubs():
        t_dict = {}
        def query_player(qs_dict):
            try:
                base_params = {
                    "title": "Anime",
                    "url": "http://localhost:8080",
                    "token": "447d179e875efe44217f20d1ee2146be",
                }
                base_params.update(qs_dict)
                k_url = f"https://kodik-api.com/get-player?{urllib.parse.urlencode(base_params)}"
                k_req = urllib.request.Request(k_url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
                k_res = json.loads(urllib.request.urlopen(k_req, timeout=5).read().decode())
                link = k_res.get("link")
                if not link:
                    return
                p_url = ("https:" if link.startswith("//") else "") + link
                ep_val = qs_dict.get("episode")
                if ep_val:
                    p_url += ("&" if "?" in p_url else "?") + f"episode={ep_val}"
                p_req = urllib.request.Request(
                    p_url,
                    headers={
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
                        "Referer": "https://kodikplayer.com/",
                    },
                )
                html = urllib.request.urlopen(p_req, timeout=5).read().decode("utf-8", errors="ignore")
                t_idx = html.find('class="serial-translations-box"')
                if t_idx != -1:
                    t_end = html.find("</select>", t_idx)
                    box = html[t_idx : t_end + 9]
                    for m in re.finditer(r'<option([^>]*)>(.*?)</option>', box, re.DOTALL):
                        attrs = m.group(1)
                        raw_text = m.group(2).strip()
                        m_id = re.search(r'data-id="([^"]*)"', attrs)
                        m_mid = re.search(r'data-media-id="([^"]*)"', attrs)
                        m_mhash = re.search(r'data-media-hash="([^"]*)"', attrs)
                        m_title = re.search(r'data-title="([^"]*)"', attrs)
                        m_count = re.search(r'data-episode-count="([^"]*)"', attrs)
                        m_type = re.search(r'data-translation-type="([^"]*)"', attrs)

                        title = (m_title.group(1) if m_title else raw_text).replace("&amp;", "&").strip()
                        if not title:
                            continue
                        ep_count_str = m_count.group(1) if m_count else ""
                        ep_min, ep_max = parse_episode_range(ep_count_str)
                        t_type_val = m_type.group(1) if m_type else "voice"
                        is_sub = t_type_val == "subtitles" or "субтитр" in title.lower() or "sub" in title.lower()

                        norm_t = title.lower()
                        badge_label = f"{ep_min}–{ep_max} эп." if ep_max > ep_min else (f"{ep_max} эп." if ep_max > 0 else "")

                        if norm_t not in t_dict or (ep_max > t_dict[norm_t]["ep_max"]):
                            t_dict[norm_t] = {
                                "id": m_id.group(1) if m_id else str(len(t_dict)),
                                "media_id": m_mid.group(1) if m_mid else "",
                                "media_hash": m_mhash.group(1) if m_mhash else "",
                                "title": title,
                                "ep_min": ep_min,
                                "ep_max": ep_max,
                                "is_sub": is_sub,
                                "raw_badge": badge_label or ep_count_str,
                            }
            except Exception:
                pass

        # 1. Query by shikimori ID for episode 1
        query_player({"shikimoriID": str(anime_id), "episode": "1"})

        # 2. Also query by latest episode if show has multiple episodes to catch late/ongoing studios
        total_eps = int(details.get("episodes") or details.get("episodes_aired") or 0)
        if total_eps > 1:
            query_player({"shikimoriID": str(anime_id), "episode": str(total_eps)})

        # 3. If no dubs found by shikimoriID, search by title
        if not t_dict:
            ru_n = details.get("russian") or ""
            if ru_n:
                query_player({"title": ru_n})
            en_n = details.get("name") or ""
            if en_n and not t_dict:
                query_player({"title": en_n})

        result_holder["kodik_dubs"] = list(t_dict.values())

    def get_similar():
        try:
            sim = http_get_json(
                f"https://shikimori.one/api/animes/{anime_id}/similar", timeout=8
            )
            if isinstance(sim, list):
                sim = sim[:14]
                enrich_with_anilist_artwork(sim)
                result_holder["similar"] = sim
        except Exception:
            pass

    def get_related():
        try:
            rel = http_get_json(
                f"https://shikimori.one/api/animes/{anime_id}/related", timeout=8
            )
            if isinstance(rel, list):
                VALID_FRANCHISE_RELATIONS = {
                    "sequel", "prequel", "side story", "parent story", "full story",
                    "summary", "alternative version", "alternative setting", "spin-off"
                }
                # Strictly filter out crossover cameos ('character' relation) and ads/commercial clips ('other' relation)
                anime_rels = []
                for r in rel:
                    if not r.get("anime"):
                        continue
                    r_type = (r.get("relation") or "").strip().lower()
                    if r_type not in VALID_FRANCHISE_RELATIONS:
                        continue
                    anime_rels.append(r)

                enrich_with_anilist_artwork(anime_rels)
                result_holder["related"] = anime_rels[:30]
        except Exception:
            pass

    def get_kitsu_titles():
        try:
            total_hint = int(details.get("episodes") or details.get("episodes_aired") or details.get("real_episodes_aired") or 24)
            result_holder["kitsu_titles"] = fetch_kitsu_episode_titles(anime_id, total_hint)
        except Exception:
            pass

    def get_roles():
        try:
            roles = http_get_json(
                f"https://shikimori.one/api/animes/{anime_id}/roles", timeout=8
            )
            if isinstance(roles, list):
                chars = [
                    r
                    for r in roles
                    if r.get("character")
                    and ("Main" in (r.get("roles") or []) or "Supporting" in (r.get("roles") or []))
                ]
                chars.sort(key=lambda x: 0 if "Main" in (x.get("roles") or []) else 1)
                for c in chars[:12]:
                    ch = c.get("character") or {}
                    img = ch.get("image") or {}
                    orig = img.get("original") or img.get("preview") or ""
                    ch["avatar_url"] = (
                        f"https://shikimori.one{orig}"
                        if orig and "missing" not in orig
                        else ""
                    )
                result_holder["roles"] = chars[:12]
        except Exception:
            pass

    def get_anilibria():
        try:
            ru_name = details.get("russian") or ""
            en_name = details.get("name") or ""
            search_term = ru_name if ru_name else en_name
            if not search_term:
                return
            q = urllib.parse.quote(search_term)
            search_res = http_get_json(
                f"https://anilibria.top/api/v1/app/search/releases?query={q}",
                timeout=7,
            )
            if not isinstance(search_res, list) or not search_res:
                if en_name and en_name != search_term:
                    q2 = urllib.parse.quote(en_name)
                    search_res = http_get_json(
                        f"https://anilibria.top/api/v1/app/search/releases?query={q2}",
                        timeout=7,
                    )
            if isinstance(search_res, list) and search_res:
                matched_release = None
                for item in search_res:
                    shiki_obj = item.get("shikimori") or {}
                    mal_obj = item.get("mal") or {}
                    if str(shiki_obj.get("id")) == str(anime_id) or str(mal_obj.get("id")) == str(anime_id):
                        matched_release = item
                        break
                if not matched_release:
                    ru_lower = ru_name.strip().lower()
                    for item in search_res:
                        main_title = (item.get("name") or {}).get("main") or ""
                        if main_title.strip().lower() == ru_lower:
                            matched_release = item
                            break
                # Strict match: do NOT fall back to search_res[0] to prevent attaching 12-ep TV shows to unreleased movies
                if not matched_release:
                    shiki_kind = (details.get("kind") or "").lower()
                    ru_lower = ru_name.strip().lower()
                    for item in search_res:
                        main_title = ((item.get("name") or {}).get("main") or "").strip().lower()
                        if ru_lower and (ru_lower in main_title or main_title in ru_lower):
                            ep_tot = int(item.get("episodes_total") or 0)
                            if shiki_kind in ["movie", "special"] and ep_tot > 3:
                                continue
                            matched_release = item
                            break

                rel_id = matched_release.get("id")
                if rel_id:
                    full_rel = http_get_json(
                        f"https://anilibria.top/api/v1/anime/releases/{rel_id}",
                        timeout=8,
                    )
                    if isinstance(full_rel, dict) and full_rel.get("episodes"):
                        episodes_clean = []
                        for ep in full_rel.get("episodes") or []:
                            prev_src = ((ep.get("preview") or {}).get("src")) or ""
                            episodes_clean.append(
                                {
                                    "ordinal": ep.get("ordinal"),
                                    "name": ep.get("name") or f"Серия {ep.get('ordinal')}",
                                    "duration": ep.get("duration"),
                                    "hls_1080": ep.get("hls_1080"),
                                    "hls_720": ep.get("hls_720"),
                                    "hls_480": ep.get("hls_480"),
                                    "opening": ep.get("opening"),
                                    "ending": ep.get("ending"),
                                    "updated_at": ep.get("updated_at"),
                                    "preview": f"https://anilibria.top{prev_src}"
                                    if prev_src
                                    else None,
                                }
                            )
                        result_holder["anilibria"] = {
                            "release_id": rel_id,
                            "title_ru": (full_rel.get("name") or {}).get("main"),
                            "title_en": (full_rel.get("name") or {}).get("english"),
                            "exact_match": str((matched_release.get("shikimori") or {}).get("id")) == str(anime_id)
                            or ((matched_release.get("name") or {}).get("main") or "").strip().lower() == ru_name.strip().lower(),
                            "episodes_count": len(episodes_clean),
                            "episodes": episodes_clean,
                        }
        except Exception:
            pass

    def get_seasons():
        try:
            result_holder["seasons"] = extract_anime_seasons(anime_id)
        except Exception:
            pass

    threads = [
        threading.Thread(target=get_similar),
        threading.Thread(target=get_related),
        threading.Thread(target=get_roles),
        threading.Thread(target=get_anilibria),
        threading.Thread(target=get_kodik_dubs),
        threading.Thread(target=get_kitsu_titles),
        threading.Thread(target=get_seasons),
    ]
    for t in threads:
        t.start()
    for t in threads:
        t.join(timeout=9)

    # Clean screenshots
    screenshots = []
    for s in (details.get("screenshots") or [])[:10]:
        orig = s.get("original") or ""
        prev = s.get("preview") or ""
        if orig:
            screenshots.append(
                {
                    "original": f"https://shikimori.one{orig}",
                    "preview": f"https://shikimori.one{prev}" if prev else f"https://shikimori.one{orig}",
                }
            )
    details["screenshots_clean"] = screenshots

    # Clean videos / trailers
    videos_clean = []
    for v in details.get("videos") or []:
        p_url = v.get("player_url") or ""
        if p_url.startswith("http://"):
            p_url = "https://" + p_url[len("http://") :]
        videos_clean.append(
            {
                "id": v.get("id"),
                "name": v.get("name") or "Трейлер",
                "kind": v.get("kind"),
                "url": v.get("url"),
                "player_url": p_url,
                "image_url": (v.get("image_url") or "").replace("http://", "https://"),
            }
        )
    details["videos_clean"] = videos_clean

    # =========================================================================
    # Build COMPLETE Real-Time Episode List (1..MaxEpisodes, e.g. 1..1180 for One Piece)
    # =========================================================================
    anilibria_data = result_holder["anilibria"]
    anilibria_ep_map = {}
    max_anilibria_ord = 0
    if anilibria_data and anilibria_data.get("episodes"):
        for ep in anilibria_data["episodes"]:
            ord_num = int(ep.get("ordinal") or 0)
            if ord_num > 0:
                anilibria_ep_map[ord_num] = ep
                if ord_num > max_anilibria_ord:
                    max_anilibria_ord = ord_num

    # Also check AniList streamingEpisodes titles if available
    al_cache_entry = _POSTER_CACHE.get(int(anime_id)) or {}
    streaming_eps = al_cache_entry.get("streaming_eps") or []
    streaming_title_map = {}
    for s_ep in streaming_eps:
        t_str = s_ep.get("title") or ""
        # Often formatted like "Episode 1180 - Title"
        if t_str.lower().startswith("episode "):
            parts = t_str.split(" - ", 1)
            num_part = parts[0].replace("Episode ", "").replace("episode ", "").strip()
            if num_part.isdigit() and len(parts) > 1:
                streaming_title_map[int(num_part)] = parts[1].strip()

    shiki_aired = int(details.get("episodes_aired") or 0)
    shiki_total = int(details.get("episodes") or 0)
    real_aired = int(details.get("real_episodes_aired") or 0)

    shiki_kind = (details.get("kind") or "").lower()
    shiki_status = (details.get("status") or "").lower()
    if shiki_status == "anons" and max_anilibria_ord == 0 and real_aired == 0 and shiki_aired == 0:
        total_available_episodes = 0
    elif shiki_kind in ["movie", "special", "ova", "ona"]:
        if shiki_status == "released" or shiki_aired >= 1:
            total_available_episodes = max(1, shiki_total, max_anilibria_ord)
        elif shiki_status == "anons":
            total_available_episodes = 0
        else:
            total_available_episodes = max(real_aired, shiki_aired, max_anilibria_ord) or 1
    else:
        total_available_episodes = max(
            real_aired,
            shiki_aired,
            shiki_total if shiki_status == "released" else 0,
            max_anilibria_ord,
            1 if shiki_status != "anons" else 0,
        )

    # Cap at 3000 just for safety, allowing 1180+ for One Piece, Detective Conan, etc.
    total_available_episodes = min(total_available_episodes, 3000)

    screens = details.get("screenshots_clean") or []
    default_bg = details.get("banner_url") or details.get("poster_url") or ""

    kitsu_titles = result_holder.get("kitsu_titles") or fetch_kitsu_episode_titles(anime_id, total_available_episodes)
    full_episodes_list = []
    for ep_num in range(1, total_available_episodes + 1):
        al_ep = anilibria_ep_map.get(ep_num)
        al_name = (al_ep.get("name") if al_ep else None) or ""
        is_generic = not al_name or bool(re.match(r'^(серия|эпизод|episode)\s*\d+$', al_name.strip().lower()))
        k_title = kitsu_titles.get(ep_num) or streaming_title_map.get(ep_num)

        if k_title and is_generic:
            ep_title = k_title
        elif al_name and not is_generic:
            ep_title = al_name
        else:
            ep_title = k_title or al_name or f"Серия {ep_num}"
        ep_preview = (
            (al_ep.get("preview") if al_ep else None)
            or (screens[(ep_num - 1) % len(screens)]["original"] if screens else None)
            or default_bg
        )
        full_episodes_list.append(
            {
                "ordinal": ep_num,
                "name": ep_title,
                "has_hls": bool(al_ep and (al_ep.get("hls_1080") or al_ep.get("hls_720") or al_ep.get("hls_480"))),
                "hls_1080": al_ep.get("hls_1080") if al_ep else None,
                "hls_720": al_ep.get("hls_720") if al_ep else None,
                "hls_480": al_ep.get("hls_480") if al_ep else None,
                "kodik_link": f"https://kodikplayer.com/find-player?shikimoriID={anime_id}&episode={ep_num}",
                "opening": al_ep.get("opening") if al_ep else None,
                "ending": al_ep.get("ending") if al_ep else None,
                "preview": ep_preview,
                "duration": (al_ep.get("duration") if al_ep else None) or (details.get("duration") or 24) * 60,
            }
        )

    # Build voiceover studios list from Shikimori fandubbers + AniLibria
    fandubbers = details.get("fandubbers") or []
    fansubbers = details.get("fansubbers") or []
    default_dubs = [
        "AniLibria",
        "Studio Band (Студийная Банда)",
        "AniDUB",
        "SHIZA Project",
        "AnimeVost",
        "Dream Cast",
        "Jam Club",
        "2x2 / Официальный дубляж",
        "Японский оригинал + Русские субтитры",
    ]
    combined_dubs = []
    if anilibria_ep_map:
        al_min = min(anilibria_ep_map.keys())
        al_max = max(anilibria_ep_map.keys())
        al_badge = f"{al_min}–{al_max} эп. • FHD 1080p" if (al_min > 1 or al_max < total_available_episodes) else f"Все {len(anilibria_ep_map)} эп. • FHD 1080p"
        combined_dubs.append(
            {
                "id": "anilibria_hls",
                "name": "AniLibria.TV (Прямой поток 1080p FHD)",
                "type": "hls",
                "ep_min": al_min,
                "ep_max": al_max,
                "badge": al_badge,
                "available": True,
            }
        )

    kodik_real_dubs = result_holder.get("kodik_dubs") or []
    if kodik_real_dubs:
        seen_titles = {"anilibria.tv (прямой поток 1080p fhd)"}
        for kd in kodik_real_dubs:
            t_title = kd["title"].strip()
            norm = t_title.lower()
            if norm in seen_titles:
                continue
            seen_titles.add(norm)
            is_sub = kd.get("is_sub", False)
            ep_min = kd.get("ep_min", 1)
            ep_max = kd.get("ep_max", total_available_episodes)
            
            if ep_min == 1 and ep_max >= 99999:
                badge_ep = f"Все {total_available_episodes} эп."
            elif ep_min == 1:
                badge_ep = f"1–{ep_max} эп."
            else:
                badge_ep = f"{ep_min}–{ep_max} эп."

            dub_badge = f"{badge_ep} • {'Субтитры' if is_sub else 'Русская озвучка'}"
            combined_dubs.append(
                {
                    "id": f"kodik_{kd.get('media_id', len(combined_dubs))}",
                    "name": t_title,
                    "type": "Sub" if is_sub else "Studio",
                    "ep_min": ep_min,
                    "ep_max": ep_max,
                    "media_id": kd.get("media_id", ""),
                    "media_hash": kd.get("media_hash", ""),
                    "badge": dub_badge,
                    "available": True,
                }
            )
    else:
        seen_names = {"anilibria"}
        for dub in fandubbers + default_dubs:
            norm = dub.strip().lower()
            if norm not in seen_names:
                seen_names.add(norm)
                is_sub = "субтитр" in norm or "sub" in norm
                combined_dubs.append(
                    {
                        "id": f"dub_{len(combined_dubs)}",
                        "name": dub,
                        "type": "Sub" if is_sub else "Studio",
                        "ep_min": 1,
                        "ep_max": total_available_episodes,
                        "badge": "Субтитры" if is_sub else "Русская озвучка",
                        "available": True,
                    }
                )

    payload = {
        "anime": details,
        "total_available_episodes": total_available_episodes,
        "full_episodes": full_episodes_list,
        "similar": result_holder["similar"],
        "related": result_holder["related"],
        "seasons": result_holder["seasons"],
        "roles": result_holder["roles"],
        "anilibria": result_holder["anilibria"],
        "voiceovers": combined_dubs,
        "synced_at": int(time.time()),
    }

    cache_set(cache_key, payload, ttl=300)
    return payload


def fetch_home_curated(force_refresh=False):
    """Fetch complete home page sections in parallel, with real-time update timestamps."""
    cache_key = "home_curated_v2"
    if not force_refresh:
        cached = cache_get(cache_key)
        if cached is not None:
            return cached

    sections = {
        "ongoing_top": [],
        "popular_all_time": [],
        "top_rated": [],
        "recent_anilibria": [],
        "calendar": [],
        "synced_at": int(time.time()),
    }

    def load_ongoing():
        try:
            sections["ongoing_top"] = fetch_shikimori_animes(
                {"status": "ongoing", "order": "popularity", "limit": 16},
                force_refresh=force_refresh,
            )
        except Exception:
            pass

    def load_popular():
        try:
            sections["popular_all_time"] = fetch_shikimori_animes(
                {"order": "popularity", "limit": 16},
                force_refresh=force_refresh,
            )
        except Exception:
            pass

    def load_top_rated():
        try:
            sections["top_rated"] = fetch_shikimori_animes(
                {"order": "ranked", "limit": 16},
                force_refresh=force_refresh,
            )
        except Exception:
            pass

    def load_calendar():
        try:
            cal = http_get_json("https://shikimori.one/api/calendar", timeout=10)
            if isinstance(cal, list):
                trimmed = cal[:32]
                enrich_with_anilist_artwork(trimmed, force_refresh=force_refresh)
                sections["calendar"] = trimmed
        except Exception:
            pass

    def load_anilibria_fresh():
        try:
            fresh = http_get_json(
                "https://anilibria.top/api/v1/anime/releases/latest?limit=12",
                timeout=8,
            )
            if isinstance(fresh, list):
                cleaned = []
                for r in fresh:
                    shiki_id = (r.get("shikimori") or {}).get("id") or (r.get("mal") or {}).get("id")
                    poster_src = ((r.get("poster") or {}).get("src")) or ""
                    cleaned.append(
                        {
                            "anilibria_id": r.get("id"),
                            "shikimori_id": shiki_id,
                            "russian": (r.get("name") or {}).get("main"),
                            "name": (r.get("name") or {}).get("english"),
                            "year": r.get("year"),
                            "type": (r.get("type") or {}).get("description") or "ТВ",
                            "episodes_total": r.get("episodes_total"),
                            "fresh_at": r.get("fresh_at") or r.get("updated_at"),
                            "poster_url": f"https://anilibria.top{poster_src}" if poster_src else "",
                            "description": r.get("description"),
                            "age_rating": (r.get("age_rating") or {}).get("label"),
                            "genres": [g.get("name") for g in (r.get("genres") or [])],
                        }
                    )
                sections["recent_anilibria"] = cleaned
        except Exception:
            pass

    threads = [
        threading.Thread(target=load_ongoing),
        threading.Thread(target=load_popular),
        threading.Thread(target=load_top_rated),
        threading.Thread(target=load_calendar),
        threading.Thread(target=load_anilibria_fresh),
    ]
    for t in threads:
        t.start()
    for t in threads:
        t.join(timeout=11)

    cache_set(cache_key, sections, ttl=180)
    return sections


def caesar_shift(text: str, shift: int) -> str:
    result = []
    for char in text:
        if "a" <= char <= "z":
            result.append(chr((ord(char) - ord("a") - shift) % 26 + ord("a")))
        elif "A" <= char <= "Z":
            result.append(chr((ord(char) - ord("A") - shift) % 26 + ord("A")))
        else:
            result.append(char)
    return "".join(result)


def decode_kodik_link(src: str) -> str:
    for shift in range(-26, 27):
        try:
            padded = src + "=" * (-len(src) % 4)
            shifted = caesar_shift(padded, shift)
            decoded = base64.b64decode(shifted).decode("utf-8")
            if "//" in decoded or "http" in decoded:
                if decoded.startswith("//"):
                    decoded = "https:" + decoded
                return decoded
        except Exception:
            pass
    return None


def fetch_stream_manifest(anime_id: str, episode_num: int, preferred_translation: str = None):
    cache_key = f"stream_hls:{anime_id}:{episode_num}:{preferred_translation or 'default'}"
    cached = cache_get(cache_key)
    if cached is not None:
        return cached

    params = {
        "title": "Anime",
        "url": "http://localhost:8080",
        "token": "447d179e875efe44217f20d1ee2146be",
        "shikimoriID": str(anime_id),
        "episode": str(episode_num),
    }
    qs = urllib.parse.urlencode(params)
    url = f"https://kodik-api.com/get-player?{qs}"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
    try:
        res = urllib.request.urlopen(req, timeout=5)
        data = json.loads(res.read().decode())
    except Exception:
        return None

    link = data.get("link")
    if not link:
        return None

    player_url = "https:" + link if link.startswith("//") else link
    if "?" in player_url:
        player_url += f"&episode={episode_num}"
    else:
        player_url += f"?episode={episode_num}"

    req2 = urllib.request.Request(
        player_url,
        headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
            "Referer": "https://kodikplayer.com/",
        },
    )
    try:
        html = urllib.request.urlopen(req2, timeout=6).read().decode("utf-8", errors="ignore")
    except Exception:
        return None

    translations_list = []
    t_box_idx = html.find('class="serial-translations-box"')
    if t_box_idx != -1:
        t_box_end = html.find("</select>", t_box_idx)
        t_box = html[t_box_idx : t_box_end + 9]
        for match in re.finditer(r'<option([^>]*)>(.*?)</option>', t_box, re.DOTALL):
            attrs = match.group(1)
            raw_text = match.group(2).strip()
            
            m_id = re.search(r'data-id="([^"]*)"', attrs)
            m_mid = re.search(r'data-media-id="([^"]*)"', attrs)
            m_mhash = re.search(r'data-media-hash="([^"]*)"', attrs)
            m_title = re.search(r'data-title="([^"]*)"', attrs)
            m_count = re.search(r'data-episode-count="([^"]*)"', attrs)
            m_type = re.search(r'data-translation-type="([^"]*)"', attrs)
            
            title = (m_title.group(1) if m_title else raw_text).replace("&amp;", "&").strip()
            ep_count_str = m_count.group(1) if m_count else ""
            ep_min, ep_max = parse_episode_range(ep_count_str)
            t_type_val = m_type.group(1) if m_type else "voice"
            is_sub = t_type_val == "subtitles" or "субтитр" in title.lower() or "sub" in title.lower()
            
            translations_list.append({
                "id": m_id.group(1) if m_id else "",
                "media_id": m_mid.group(1) if m_mid else "",
                "media_hash": m_mhash.group(1) if m_mhash else "",
                "title": title,
                "ep_min": ep_min,
                "ep_max": ep_max,
                "is_sub": is_sub,
            })

    # Pick valid translation that actually voiced episode_num
    valid_for_ep = [t for t in translations_list if t["ep_min"] <= episode_num <= t["ep_max"]]
    if not valid_for_ep:
        valid_for_ep = translations_list

    chosen = None
    if preferred_translation and valid_for_ep:
        pref_clean = re.sub(r'[^a-zA-Zа-яА-Я0-9]', '', preferred_translation.lower())
        for t in valid_for_ep:
            t_clean = re.sub(r'[^a-zA-Zа-яА-Я0-9]', '', t["title"].lower())
            if pref_clean in t_clean or t_clean in pref_clean:
                chosen = t
                break

    # If preferred translation is unavailable on this episode or none provided,
    # pick the highest-priority Russian dub that HAS this episode!
    if not chosen and valid_for_ep:
        voice_only = [t for t in valid_for_ep if not t["is_sub"]]
        priority_studios = [
            "2x2", "studio band", "дубляж", "animedia", "persona99",
            "shachiburi", "le-production", "aniliberty", "amazing dubbing",
            "послесмешье", "oprus", "shiza", "animevost", "dream cast", "jam club"
        ]
        for p in priority_studios:
            for t in voice_only:
                if p in t["title"].lower():
                    chosen = t
                    break
            if chosen:
                break

        if not chosen and voice_only:
            chosen = voice_only[0]
        if not chosen:
            chosen = valid_for_ep[0]

    chosen_media_id = chosen["media_id"] if chosen else None
    chosen_media_hash = chosen["media_hash"] if chosen else None
    chosen_translation_title = chosen["title"] if chosen else (translations_list[0]["title"] if translations_list else "Русская озвучка")

    if chosen_media_id and chosen_media_hash:
        new_player_url = f"https://kodikplayer.com/serial/{chosen_media_id}/{chosen_media_hash}/720p?episode={episode_num}"
        req_trans = urllib.request.Request(
            new_player_url,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
                "Referer": "https://kodikplayer.com/",
            },
        )
        try:
            html = urllib.request.urlopen(req_trans, timeout=6).read().decode("utf-8", errors="ignore")
            player_url = new_player_url
        except Exception:
            pass

    try:
        vinfo_type = re.search(r'vInfo\.type\s*=\s*[\'"]([^\'"]+)', html).group(1)
        vinfo_hash = re.search(r'vInfo\.hash\s*=\s*[\'"]([^\'"]+)', html).group(1)
        vinfo_id = re.search(r'vInfo\.id\s*=\s*[\'"]([^\'"]+)', html).group(1)
        d_sign = re.search(r'var d_sign\s*=\s*[\'"]([^\'"]+)', html).group(1)
        pd_sign = re.search(r'var pd_sign\s*=\s*[\'"]([^\'"]+)', html).group(1)
        ref_sign = re.search(r'var ref_sign\s*=\s*[\'"]([^\'"]+)', html).group(1)
    except Exception:
        return None

    post_data = {
        "type": vinfo_type,
        "hash": vinfo_hash,
        "id": vinfo_id,
        "d": "kodikplayer.com",
        "d_sign": d_sign,
        "pd": "kodikplayer.com",
        "pd_sign": pd_sign,
        "ref": "https://kodikplayer.com/",
        "ref_sign": ref_sign,
        "bad_user": False,
        "info": "{}",
    }
    encoded_data = urllib.parse.urlencode(post_data).encode("utf-8")
    ftor_req = urllib.request.Request(
        "https://kodikplayer.com/ftor",
        data=encoded_data,
        headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
            "Referer": player_url,
            "X-Requested-With": "XMLHttpRequest",
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        },
    )
    try:
        res_ftor = urllib.request.urlopen(ftor_req, timeout=6)
        ftor_data = json.loads(res_ftor.read().decode("utf-8"))
    except Exception:
        return None

    links = ftor_data.get("links", {})
    streams = {}
    for q_label in ["1080", "720", "480", "360"]:
        if q_label in links and links[q_label]:
            enc_src = links[q_label][0].get("src")
            if enc_src:
                dec = decode_kodik_link(enc_src)
                if dec:
                    streams[q_label] = dec

    fallback_player_url = player_url
    if chosen_media_id and chosen_media_hash:
        fallback_player_url = f"https://kodikplayer.com/serial/{chosen_media_id}/{chosen_media_hash}/720p?episode={episode_num}"

    result = {
        "episode": episode_num,
        "streams": streams,
        "translations": translations_list,
        "active_translation": chosen_translation_title or (translations_list[0]["title"] if translations_list else "Русская озвучка"),
        "fallback_player": fallback_player_url,
    }
    if streams:
        cache_set(cache_key, result, ttl=3600)
    return result


class LumaAnimeHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=STATIC_DIR, **kwargs)

    def log_message(self, fmt, *args):
        pass

    def send_json(self, data, status=200):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        content_len = int(self.headers.get("Content-Length", 0))
        post_body = self.rfile.read(content_len) if content_len > 0 else b"{}"
        try:
            data = json.loads(post_body.decode("utf-8"))
        except Exception:
            data = {}

        if path == "/api/collections":
            user_id = data.get("user_id", "guest")
            safe_uid = re.sub(r"[^a-zA-Z0-9_\-]", "_", str(user_id))
            user_dir = os.path.join(LUMA_DATA_DIR, "users", safe_uid)
            os.makedirs(user_dir, exist_ok=True)
            col_file = os.path.join(user_dir, "collections.json")
            with open(col_file, "w", encoding="utf-8") as f:
                json.dump(data.get("collections", {}), f, ensure_ascii=False, indent=2)
            return self.send_json({"success": True})

        elif path == "/api/watch-progress":
            user_id = data.get("user_id", "guest")
            safe_uid = re.sub(r"[^a-zA-Z0-9_\-]", "_", str(user_id))
            user_dir = os.path.join(LUMA_DATA_DIR, "users", safe_uid)
            os.makedirs(user_dir, exist_ok=True)
            wp_file = os.path.join(user_dir, "watch_progress.json")
            with open(wp_file, "w", encoding="utf-8") as f:
                json.dump(data.get("progress", {}), f, ensure_ascii=False, indent=2)
            return self.send_json({"success": True})

        return self.send_json({"error": "Not Found"}, status=404)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        qs = urllib.parse.parse_qs(parsed.query)

        def qval(key, default=None):
            vals = qs.get(key)
            return vals[0] if vals else default

        force_refresh = qval("refresh") == "1"

        try:
            if path == "/api/network-info":
                ip = get_local_ip()
                return self.send_json({
                    "ip": ip,
                    "port": PORT,
                    "local_url": f"http://localhost:{PORT}",
                    "network_url": f"http://{ip}:{PORT}"
                })

            elif path == "/api/home":
                data = fetch_home_curated(force_refresh=force_refresh)
                return self.send_json(data)

            elif path == "/api/catalog":
                params = {
                    "page": qval("page", "1"),
                    "limit": qval("limit", "24"),
                    "order": qval("order", "popularity"),
                    "kind": qval("kind"),
                    "status": qval("status"),
                    "season": qval("season"),
                    "score": qval("score"),
                    "genre": qval("genre"),
                    "search": qval("search"),
                    "rating": qval("rating"),
                    "censored": "true",
                }
                data = fetch_shikimori_animes(params, force_refresh=force_refresh)
                return self.send_json({"items": data if isinstance(data, list) else []})

            elif path.startswith("/api/anime/"):
                anime_id = path.split("/api/anime/")[1].strip("/")
                if not anime_id.isdigit():
                    return self.send_json({"error": "Invalid anime ID"}, status=400)
                data = fetch_anime_full_details(anime_id, force_refresh=force_refresh)
                return self.send_json(data)

            elif path == "/api/recommendations":
                genre_id = qval("genre")
                order = qval("order", "ranked")
                page = qval("page", "1")
                limit = qval("limit", "16")
                season = qval("season")
                params = {
                    "order": order,
                    "page": page,
                    "limit": limit,
                    "genre": genre_id,
                    "season": season,
                    "censored": "true",
                }
                data = fetch_shikimori_animes(params, force_refresh=force_refresh)
                return self.send_json({"items": data if isinstance(data, list) else []})

            elif path == "/api/random":
                data = fetch_shikimori_animes(
                    {"order": "random", "limit": "1", "score": "7", "status": "released"},
                    force_refresh=True,
                )
                return self.send_json({"items": data if isinstance(data, list) else []})

            elif path == "/api/genres":
                cached = cache_get("genres_list")
                if cached is None:
                    raw_genres = http_get_json("https://shikimori.one/api/genres", timeout=10)
                    cached = [
                        g
                        for g in (raw_genres or [])
                        if g.get("entry_type") == "Anime"
                        and g.get("name") not in ("Hentai", "Yaoi", "Yuri", "Erotica")
                    ]
                    cached.sort(key=lambda x: x.get("russian") or "")
                    cache_set("genres_list", cached, ttl=86400)
                return self.send_json({"genres": cached})

            elif path == "/api/stream":
                anime_id = qval("anime_id")
                episode = qval("episode", "1")
                translation = qval("translation")
                if not anime_id or not str(anime_id).isdigit():
                    return self.send_json({"error": "Missing anime_id"}, status=400)
                data = fetch_stream_manifest(anime_id, int(episode), translation)
                if not data or not data.get("streams"):
                    return self.send_json({"error": "Stream not found", "episode": episode}, status=404)
                return self.send_json(data)

            elif path == "/api/user":
                user_file = os.path.join(LUMA_DATA_DIR, "current_user.json")
                if os.path.exists(user_file):
                    try:
                        with open(user_file, "r", encoding="utf-8") as f:
                            return self.send_json(json.load(f))
                    except Exception:
                        pass
                return self.send_json({
                    "logged_in": False,
                    "user_id": "guest",
                    "name": "Гость Luma",
                    "email": "",
                    "avatar": ""
                })

            elif path == "/api/collections":
                user_id = qval("user_id", "guest")
                safe_uid = re.sub(r"[^a-zA-Z0-9_\-]", "_", user_id)
                col_file = os.path.join(LUMA_DATA_DIR, "users", safe_uid, "collections.json")
                if os.path.exists(col_file):
                    try:
                        with open(col_file, "r", encoding="utf-8") as f:
                            return self.send_json(json.load(f))
                    except Exception:
                        pass
                return self.send_json({"items": {}})

            elif path == "/api/watch-progress":
                user_id = qval("user_id", "guest")
                safe_uid = re.sub(r"[^a-zA-Z0-9_\-]", "_", user_id)
                wp_file = os.path.join(LUMA_DATA_DIR, "users", safe_uid, "watch_progress.json")
                if os.path.exists(wp_file):
                    try:
                        with open(wp_file, "r", encoding="utf-8") as f:
                            return self.send_json(json.load(f))
                    except Exception:
                        pass
                return self.send_json({"progress": {}})

        except urllib.error.HTTPError as e:
            return self.send_json(
                {"error": f"Upstream API HTTP {e.code}", "message": str(e)}, status=502
            )
        except Exception as e:
            return self.send_json(
                {"error": "Internal Server Error", "message": str(e)}, status=500
            )

        try:
            if path != "/" and not os.path.exists(os.path.join(STATIC_DIR, path.lstrip("/"))):
                self.path = "/index.html"
            return super().do_GET()
        except (ConnectionResetError, ConnectionAbortedError, BrokenPipeError, OSError):
            return


def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"


if __name__ == "__main__":
    import sys
    for i, arg in enumerate(sys.argv):
        if arg in ("--port", "-p") and i + 1 < len(sys.argv):
            try:
                PORT = int(sys.argv[i + 1])
            except ValueError:
                pass
        elif i > 0 and arg.isdigit():
            PORT = int(arg)
    ip = get_local_ip()
    print("==================================================")
    print("  LumaAnime Streaming Server Running!")
    print(f"  > Web/Browser: http://localhost:{PORT}")
    print(f"  > Mobile/LAN:  http://{ip}:{PORT}")
    print("==================================================")
    ThreadingHTTPServer.allow_reuse_address = True
    ThreadingHTTPServer.daemon_threads = True
    while True:
        try:
            server = ThreadingHTTPServer(("0.0.0.0", PORT), LumaAnimeHandler)
            server.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server.")
            break
        except Exception as ex:
            time.sleep(1)
