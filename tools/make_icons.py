"""Coach Caddy app icon: fairway running down to a pond, gold crossed-clubs insignia on top.
Palette is shared with the app: brand green #1F5A43, gold #E2B65A, ink #0D1612, plus a pond blue."""
import io, sys, cairosvg
from PIL import Image

OUT = sys.argv[1] if len(sys.argv) > 1 else '.'

GRASS_HI, GRASS_LO = '#2F7A55', '#1F5A43'      # lit fairway -> app brand green
FRINGE = '#7FC29A'                              # bank highlight, same family as night brand #62C08F
WATER_HI, WATER_LO = '#2D6F93', '#173F5A'       # pond blue, same depth/value as the greens
RIPPLE = '#8CC3DD'
GOLD, INK = '#E2B65A', '#0D1612'

SHORE = 'M0 340 C 110 332, 178 404, 256 404 C 334 404, 402 332, 512 340'  # grass tongue holds the ball, pond wraps the corners

def insignia(color, extra=''):
    # 64-unit insignia, scaled 6x into the 512 canvas (ring radius 174px, inside the maskable safe zone)
    return f'''<g transform="translate(64 64) scale(6)" {extra}>
  <circle cx="32" cy="32" r="29" fill="none" stroke="{color}" stroke-width="3.2"/>
  <g stroke="{color}" stroke-linecap="round" fill="none">
    <line x1="19" y1="15" x2="43" y2="45" stroke-width="3.4"/>
    <line x1="45" y1="15" x2="21" y2="45" stroke-width="3.4"/>
    <line x1="19" y1="15" x2="22.8" y2="19.8" stroke-width="6.2"/>
    <line x1="45" y1="15" x2="41.2" y2="19.8" stroke-width="6.2"/>
  </g>
  <g fill="{color}">
    <path d="M41 43 L50.5 47.6 L48.8 51.8 L39.2 47.6 Z"/>
    <ellipse cx="17" cy="48" rx="7" ry="4.4" transform="rotate(-25 17 48)"/>
    <circle cx="32" cy="50.5" r="4"/>
  </g>
</g>'''

def svg(rounded):
    stripes = ''.join(
        f'<rect x="{x}" y="-200" width="46" height="1000" fill="#FFFFFF" fill-opacity="0.04"/>'
        for x in range(-300, 800, 92))
    clip = '<clipPath id="tile"><rect width="512" height="512" rx="112"/></clipPath>' if rounded else ''
    open_g = '<g clip-path="url(#tile)">' if rounded else '<g>'
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
<defs>
  <linearGradient id="grass" x1="0" y1="0" x2="0.35" y2="1">
    <stop offset="0" stop-color="{GRASS_HI}"/><stop offset="1" stop-color="{GRASS_LO}"/></linearGradient>
  <linearGradient id="water" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="{WATER_HI}"/><stop offset="1" stop-color="{WATER_LO}"/></linearGradient>
  {clip}
</defs>
{open_g}
  <rect width="512" height="512" fill="url(#grass)"/>
  <g transform="rotate(-32 256 256)">{stripes}</g>
  <path d="{SHORE} L512 512 L0 512 Z" fill="url(#water)"/>
  <path d="{SHORE}" fill="none" stroke="{FRINGE}" stroke-width="5" stroke-opacity="0.55"/>
  <g fill="none" stroke="{RIPPLE}" stroke-linecap="round" stroke-opacity="0.45" stroke-width="4">
    <path d="M38 420 q 24 -9 48 0"/><path d="M420 414 q 26 -10 52 0"/><path d="M196 474 q 22 -8 44 0"/><path d="M110 488 q 18 -7 36 0"/><path d="M340 470 q 20 -7 40 0"/>
  </g>
  {insignia(INK, 'transform-origin="0 0" opacity="0.28"').replace('translate(64 64)', 'translate(68 72)')}
  {insignia(GOLD)}
</g>
</svg>'''

def png(svg_text, size):
    data = cairosvg.svg2png(bytestring=svg_text.encode(), output_width=size, output_height=size)
    return Image.open(io.BytesIO(data)).convert('RGBA')

rounded, square = svg(True), svg(False)
open(f'{OUT}/icon.svg', 'w').write(rounded)
png(rounded, 192).save(f'{OUT}/icon-192.png')
png(rounded, 512).save(f'{OUT}/icon-512.png')
png(square, 512).save(f'{OUT}/icon-512-maskable.png')        # full bleed, platforms apply their own mask
png(square, 180).convert('RGB').save(f'{OUT}/apple-touch-icon.png')  # iOS rounds it; no transparent corners
print('ok')
