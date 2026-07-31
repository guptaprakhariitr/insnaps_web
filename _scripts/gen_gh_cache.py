#!/usr/bin/env python3
"""Generate products/gh-cache.json — a static snapshot of GitHub repo + latest
release info for the portfolio page, so the browser never calls the GitHub API
(which trips abuse/rate limits on a public page).

Auth: uses $GH_TOKEN if set (recommended; 5000 req/hr), else unauthenticated.
The token is read from the environment only and is never printed or written.

Run from repo root:  GH_TOKEN="$(security find-generic-password -s decant-gh-release-pat -w)" python3 _scripts/gen_gh_cache.py
Hooked into build.sh so every build refreshes the snapshot.
"""
import json, os, sys, urllib.request, urllib.error
from datetime import datetime, timezone

OWNER = "guptaprakhariitr"
REPOS = ["vigil", "decant", "aiconnect-figma-mcp", "glaze", "twinned", "caliper", "tray-mac"]
OUT = os.path.join(os.path.dirname(__file__), "..", "products", "gh-cache.json")

TOKEN = os.environ.get("GH_TOKEN", "").strip()


def gh(path):
    req = urllib.request.Request("https://api.github.com" + path)
    req.add_header("Accept", "application/vnd.github+json")
    req.add_header("User-Agent", "insnaps-portfolio-cache")
    if TOKEN:
        req.add_header("Authorization", "Bearer " + TOKEN)
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        if e.code != 404:
            print(f"  ! {path} -> HTTP {e.code}", file=sys.stderr)
        return None
    except Exception as e:
        print(f"  ! {path} -> {e}", file=sys.stderr)
        return None


def pick_dmg(assets):
    assets = assets or []
    dmg = next((a for a in assets if str(a.get("name", "")).lower().endswith(".dmg")), None)
    a = dmg or (assets[0] if assets else None)
    if not a:
        return None
    return {"name": a.get("name"), "url": a.get("browser_download_url"), "size": a.get("size")}


def main():
    out = {"generatedAt": datetime.now(timezone.utc).isoformat(), "repos": {}}
    ok = 0
    for name in REPOS:
        full = f"{OWNER}/{name}"
        info = gh(f"/repos/{full}")
        if not info:
            continue
        rel = gh(f"/repos/{full}/releases/latest")
        lic = (info.get("license") or {}).get("spdx_id")
        if lic == "NOASSERTION":
            lic = None
        entry = {
            "pushed_at": info.get("pushed_at"),
            "stars": info.get("stargazers_count"),
            "language": info.get("language"),
            "license": lic,
        }
        if rel:
            entry["release"] = {
                "tag": rel.get("tag_name") or rel.get("name"),
                "published_at": rel.get("published_at"),
                "dmg": pick_dmg(rel.get("assets")),
            }
        out["repos"][full] = entry
        ok += 1
        print(f"  + {full}: {entry.get('language')} | {(entry.get('release') or {}).get('tag','-')}")

    # Never clobber a good snapshot with an empty one (bad/expired token, network
    # down, rate limit). Keep whatever is already on disk instead.
    if ok == 0 and os.path.exists(OUT):
        print(f"  ! 0/{len(REPOS)} repos resolved — keeping existing {os.path.relpath(OUT)}", file=sys.stderr)
        return 0

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w") as f:
        json.dump(out, f, indent=2)
    print(f"Wrote {os.path.relpath(OUT)} ({ok}/{len(REPOS)} repos, auth={'yes' if TOKEN else 'no'})")
    # Non-fatal: a build should still succeed even if all lookups failed.
    return 0


if __name__ == "__main__":
    sys.exit(main())
