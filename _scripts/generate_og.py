#!/usr/bin/env python3
"""Generate insnaps_og.png — branded Open Graph social card (1200x630)."""

from PIL import Image, ImageDraw, ImageFont
import os

W, H = 1200, 630
BG = (5, 5, 5)
ACCENT = (20, 184, 166)
ACCENT_DIM = (13, 100, 92)
FG = (245, 245, 247)
FG_SEC = (161, 161, 166)

img = Image.new("RGB", (W, H), BG)
draw = ImageDraw.Draw(img)

try:
    font_title = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 72)
    font_tagline = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 28)
    font_desc = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 22)
    font_badge = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 18)
    font_url = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 20)
except:
    font_title = ImageFont.load_default()
    font_tagline = font_title
    font_desc = font_title
    font_badge = font_title
    font_url = font_title

# Subtle grid pattern
for x in range(0, W, 60):
    draw.line([(x, 0), (x, H)], fill=(255, 255, 255, 8), width=1)
for y in range(0, H, 60):
    draw.line([(0, y), (W, y)], fill=(255, 255, 255, 8), width=1)

# Accent glow (simulated radial gradient with overlapping circles)
glow_img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
glow_draw = ImageDraw.Draw(glow_img)
cx, cy = W // 2, H + 100
for r in range(400, 0, -5):
    alpha = max(0, min(30, int(30 * (1 - r / 400))))
    glow_draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(20, 184, 166, alpha))
img.paste(Image.alpha_composite(Image.new("RGBA", (W, H), BG + (255,)), glow_img).convert("RGB"))

# Top accent bar
draw = ImageDraw.Draw(img)
draw.rectangle([0, 0, W, 4], fill=ACCENT)

# Live badge
badge_text = "LIVE — Monitoring 30+ Conflicts"
badge_bbox = draw.textbbox((0, 0), badge_text, font=font_badge)
bw = badge_bbox[2] - badge_bbox[0] + 32
bx = (W - bw) // 2
by = 120
draw.rounded_rectangle([bx, by, bx + bw, by + 36], radius=18, fill=(20, 184, 166, 30), outline=ACCENT)
draw.text((bx + 16, by + 7), badge_text, fill=ACCENT, font=font_badge)

# Pulsing dot (static for image)
draw.ellipse([bx + 8, by + 14, bx + 14, by + 20], fill=ACCENT)

# Title
title = "InSnaps"
title_bbox = draw.textbbox((0, 0), title, font=font_title)
tw = title_bbox[2] - title_bbox[0]
draw.text(((W - tw) // 2, 180), title, fill=FG, font=font_title)

# Tagline
tagline = "Swipe & Share Global News"
tag_bbox = draw.textbbox((0, 0), tagline, font=font_tagline)
tgw = tag_bbox[2] - tag_bbox[0]
draw.text(((W - tgw) // 2, 270), tagline, fill=ACCENT, font=font_tagline)

# Description lines
lines = [
    "Shareable News Cards · 13 Domains · Custom Layouts",
    "iPhone · iPad · Mac · Android",
    "Free · Private · Beautiful",
]
y_start = 330
for i, line in enumerate(lines):
    bbox = draw.textbbox((0, 0), line, font=font_desc)
    lw = bbox[2] - bbox[0]
    color = FG_SEC if i < 2 else ACCENT
    draw.text(((W - lw) // 2, y_start + i * 38), line, fill=color, font=font_desc)

# Play Store badge area
ps_text = "Free on All Platforms"
ps_bbox = draw.textbbox((0, 0), ps_text, font=font_badge)
psw = ps_bbox[2] - ps_bbox[0] + 40
psx = (W - psw) // 2
psy = 470
draw.rounded_rectangle([psx, psy, psx + psw, psy + 40], radius=20, fill=ACCENT)
draw.text((psx + 20, psy + 9), ps_text, fill=(255, 255, 255), font=font_badge)

# Bottom URL
url_text = "insnaps.app"
url_bbox = draw.textbbox((0, 0), url_text, font=font_url)
uw = url_bbox[2] - url_bbox[0]
draw.text(((W - uw) // 2, 560), url_text, fill=FG_SEC, font=font_url)

# Bottom accent bar
draw.rectangle([0, H - 4, W, H], fill=ACCENT)

out_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "insnaps_og.png")
img.save(out_path, "PNG", optimize=True)
print(f"Generated {out_path} ({W}x{H})")
