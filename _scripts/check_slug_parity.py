#!/usr/bin/env python3
"""Fail the build if the accent-folding tables drift apart.

The slug is a contract shared by the website and the Flutter app: a link the app
shares (`/t/<slug>`) has to be the link the site resolves. Four copies of the
fold table exist because the files load independently —

  website  pulse.js          (homepage reel, exposes InSnapsPulse.slugify)
  website  viewbar.js        (loaded on pages where pulse.js is not)
  website  t/index.html      (deep-link page, deliberately self-contained)
  website  live/index.html   (town-file lookup)
  app      lib/screens/topics_screen.dart   topicSlug()

— and a silent divergence would mean shared links quietly stop resolving. This
compares the parsed tables rather than the raw text, so formatting differences
between Dart and JS do not matter.

The app copy is only checked when the appthree checkout is present; CI does not
have it. Override the location with APPTHREE_DIR.
"""
import os
import re
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
APP = os.environ.get(
    "APPTHREE_DIR",
    os.path.join(ROOT, "..", "Active projects", "appthree"),
)

WEB_FILES = ["pulse.js", "viewbar.js", "t/index.html", "live/index.html"]
DART_FILE = os.path.join(APP, "lib", "screens", "topics_screen.dart")

PAIR_JS = re.compile(r"'([^']+)'\s*:\s*'([^']*)'")


def parse_js(path):
    src = open(os.path.join(ROOT, path), encoding="utf-8").read()
    m = re.search(r"ASCII_FOLD\s*=\s*\{(.*?)\};", src, re.S)
    if not m:
        return None
    return dict(PAIR_JS.findall(m.group(1)))


def parse_dart(path):
    if not os.path.isfile(path):
        return None
    src = open(path, encoding="utf-8").read()
    m = re.search(r"_asciiFold\s*=\s*\{(.*?)\n\};", src, re.S)
    if not m:
        return None
    return dict(PAIR_JS.findall(m.group(1)))


def main():
    tables = {}
    for f in WEB_FILES:
        t = parse_js(f)
        if t is None:
            print(f"  ! {f}: no ASCII_FOLD table found", file=sys.stderr)
            return 1
        tables[f] = t

    dart = parse_dart(DART_FILE)
    if dart is None:
        print("  (appthree not present — skipping the app-side comparison)")
    else:
        tables["appthree/topics_screen.dart"] = dart

    ref_name, ref = next(iter(tables.items()))
    bad = 0
    for name, t in tables.items():
        if t == ref:
            continue
        bad += 1
        only_ref = {k: v for k, v in ref.items() if t.get(k) != v}
        only_t = {k: v for k, v in t.items() if ref.get(k) != v}
        print(f"  ! {name} differs from {ref_name}", file=sys.stderr)
        for k, v in list(only_ref.items())[:5]:
            print(f"      {ref_name} has {k!r}->{v!r}, {name} has {t.get(k)!r}", file=sys.stderr)
        for k, v in list(only_t.items())[:5]:
            print(f"      {name} has extra {k!r}->{v!r}", file=sys.stderr)

    if bad:
        print(f"  ! slug fold tables diverged across {bad} file(s)", file=sys.stderr)
        return 1

    print(f"  slug fold tables identical across {len(tables)} file(s), "
          f"{len(ref)} entries")
    return 0


if __name__ == "__main__":
    sys.exit(main())
