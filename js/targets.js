// Interactive targets for shot capture. Each view draws an SVG (358 x 430 viewBox)
// and has a hit test that turns a tap position into a structured outcome.

const W = 358, H = 430;

const IRONS = { cx: 179, cy: 190, r: 78, top: 160, bot: 220, vl: 155, vr: 203, rows: [104, 276, 360], cols: [119, 239] };
const WOODS = { cx: 179, cy: 196, r: 70, top: 169, bot: 223, vl: 156, vr: 202, tee: [166, 266, 192, 334], cols: [26, 110, 248, 332], rows: [104, 330] };
const GREEN = { cx: 179, cy: 334, r: 34, top: 322, bot: 346, vl: 168, vr: 190, cup: [179, 136], pxPerFt: 12, chunkY: 372 };
const PUTT  = { cup: [179, 150], pxPerFt: 14, start: [179, 410] };

export function viewFor(clubKind, shotType) {
  if (shotType === 'pitch' || shotType === 'chip') return 'green';
  if (shotType === 'tee' || clubKind === 'wood') return 'woods';
  return 'irons';
}

function sideNames(hand) {
  // Seen from behind the ball. For a right-hander the heel sits on the left of the ball.
  return hand === 'left' ? { L: 'toe', R: 'heel' } : { L: 'heel', R: 'toe' };
}

function chordX(g, y) {
  const dy = y - g.cy;
  return Math.sqrt(Math.max(0, g.r * g.r - dy * dy));
}

function ballSector(g, x, y, hand) {
  if (Math.hypot(x - g.cx, y - g.cy) > g.r) return null;
  const s = sideNames(hand);
  if (y < g.top) return 'thin';
  if (y > g.bot) return 'under';
  if (x < g.vl) return s.L;
  if (x > g.vr) return s.R;
  return 'pure';
}

export function hitTest(view, x, y, hand) {
  if (view === 'irons') {
    const g = IRONS;
    const sec = ballSector(g, x, y, hand);
    if (sec) return { kind: 'ball', sector: sec };
    const col = x < g.cols[0] ? 'left' : x < g.cols[1] ? 'line' : 'right';
    if (y >= g.rows[2]) return { kind: 'chunk', col };
    const row = y < g.rows[0] ? 'long' : y < g.rows[1] ? 'pin' : 'short';
    return { kind: 'grass', row, col };
  }
  if (view === 'woods') {
    const g = WOODS;
    const [tx1, ty1, tx2, ty2] = g.tee;
    if (x >= tx1 && x <= tx2 && y >= ty1 && y <= ty2) return { kind: 'tee' };
    const sec = ballSector(g, x, y, hand);
    if (sec) return { kind: 'ball', sector: sec };
    const c = g.cols;
    const col = x < c[0] ? 'obL' : x < c[1] ? 'left' : x < c[2] ? 'line' : x < c[3] ? 'right' : 'obR';
    const row = y < g.rows[0] ? 'long' : y < g.rows[1] ? 'pin' : 'short';
    return { kind: 'grass', row, col };
  }
  if (view === 'green') {
    const g = GREEN;
    const sec = ballSector(g, x, y, hand);
    if (sec) return { kind: 'ball', sector: sec };
    if (y >= g.chunkY) return { kind: 'chunk', col: x < 119 ? 'left' : x < 239 ? 'line' : 'right' };
    const [cx, cy] = g.cup;
    const dx = (x - cx) / g.pxPerFt, dy = (cy - y) / g.pxPerFt;
    const ft = Math.hypot(dx, dy);
    if (ft < 0.9) return { kind: 'green', ft: 0, dx: 0, dy: 0, row: 'pin', col: 'line', holed: true };
    return { kind: 'green', ft: Math.round(ft * 10) / 10, dx, dy, row: dy > 1.5 ? 'long' : dy < -1.5 ? 'short' : 'pin', col: dx < -1.5 ? 'left' : dx > 1.5 ? 'right' : 'line' };
  }
  if (view === 'putt') {
    const [cx, cy] = PUTT.cup;
    const dx = (x - cx) / PUTT.pxPerFt, dy = (cy - y) / PUTT.pxPerFt;
    const ft = Math.hypot(dx, dy);
    if (ft < 1.1) return { kind: 'made' };
    return { kind: 'miss', ft: Math.round(ft * 10) / 10, dx, dy, side: dx < -0.4 ? 'left' : dx > 0.4 ? 'right' : 'center', len: dy > 0 ? 'long' : 'short' };
  }
  return null;
}

// Curve from a drag path. Points are in viewBox coordinates.
// Returns null (no real drag), or 'left'/'right' bend with strength 1 (draw/fade) or 2 (hook/slice).
export function curveFromPath(pts) {
  if (pts.length < 4) return null;
  const a = pts[0], b = pts[pts.length - 1];
  const dx = b.x - a.x, dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len < 40) return null;
  let max = 0;
  for (const p of pts) {
    const c = (dx * (p.y - a.y) - dy * (p.x - a.x)) / len; // signed distance from the chord
    if (Math.abs(c) > Math.abs(max)) max = c;
  }
  const rel = Math.abs(max) / len;
  if (rel < 0.06) return { dir: 'none', strength: 0 };
  // A path that bows to the left of the chord curves right at the end, and vice versa.
  return { dir: max < 0 ? 'right' : 'left', strength: rel < 0.16 ? 1 : 2 };
}

export function curveName(curve, hand) {
  if (!curve || curve.dir === 'none') return 'none';
  const towardBody = hand === 'left' ? 'right' : 'left'; // draw direction
  if (curve.dir === towardBody) return curve.strength > 1 ? 'hook' : 'draw';
  return curve.strength > 1 ? 'slice' : 'fade';
}

// ---------- drawing ----------

// Logged shots show as small ghosts; the shot being filled in shows as a ring.
function dots(shots, pt) {
  const ghosts = shots.map(s => s.x == null ? '' : `<circle cx="${s.x}" cy="${s.y}" r="5" class="t-ghost"/>`).join('');
  return ghosts + (pt && pt.x != null ? `<circle cx="${pt.x}" cy="${pt.y}" r="12" class="t-mark"/>` : '');
}

function ballSvg(g, pending, hand, small) {
  const s = sideNames(hand);
  const hx = chordX(g, g.top), bx = chordX(g, g.bot);
  const fill = sec => {
    if (pending !== sec) return '';
    if (sec === 'thin') return `<path d="M${g.cx - hx} ${g.top} A${g.r} ${g.r} 0 0 1 ${g.cx + hx} ${g.top} Z" class="t-sel"/>`;
    if (sec === 'under') return `<path d="M${g.cx - bx} ${g.bot} A${g.r} ${g.r} 0 0 0 ${g.cx + bx} ${g.bot} Z" class="t-sel"/>`;
    if (sec === 'pure') return `<rect x="${g.vl}" y="${g.top}" width="${g.vr - g.vl}" height="${g.bot - g.top}" class="t-sel"/>`;
    const left = sec === s.L;
    const x0 = left ? g.cx - hx : g.vr, x1 = left ? g.vl : g.cx + hx;
    return left
      ? `<path d="M${x1} ${g.top} L${x0} ${g.top} A${g.r} ${g.r} 0 0 0 ${x0} ${g.bot} L${x1} ${g.bot} Z" class="t-sel"/>`
      : `<path d="M${x0} ${g.top} L${x1} ${g.top} A${g.r} ${g.r} 0 0 1 ${x1} ${g.bot} L${x0} ${g.bot} Z" class="t-sel"/>`;
  };
  const fs = small ? 11 : 15;
  const lab = small ? '' : `<g class="t-ballab" font-size="${fs}" text-anchor="middle">
      <text x="${g.cx}" y="${g.top - (g.top - (g.cy - g.r)) / 2 + 5}" font-weight="700">THIN</text>
      <text x="${(g.cx - chordX(g, g.cy) + g.vl) / 2}" y="${g.cy + 5}">${s.L}</text>
      <text x="${g.cx}" y="${g.cy + 5}" font-weight="700">pure</text>
      <text x="${(g.cx + chordX(g, g.cy) + g.vr) / 2}" y="${g.cy + 5}">${s.R}</text>
      <text x="${g.cx}" y="${g.bot + (g.cy + g.r - g.bot) / 2 + 5}">under</text></g>`;
  return `<circle cx="${g.cx}" cy="${g.cy}" r="${g.r + 2}" class="t-shadow"/>
    <circle cx="${g.cx}" cy="${g.cy}" r="${g.r}" class="t-ball"/>
    ${['thin', 'under', 'pure', s.L, s.R].map(fill).join('')}
    <g class="t-seam"><line x1="${g.cx - hx}" y1="${g.top}" x2="${g.cx + hx}" y2="${g.top}"/><line x1="${g.cx - bx}" y1="${g.bot}" x2="${g.cx + bx}" y2="${g.bot}"/>
    <line x1="${g.vl}" y1="${g.top}" x2="${g.vl}" y2="${g.bot}"/><line x1="${g.vr}" y1="${g.top}" x2="${g.vr}" y2="${g.bot}"/></g>${lab}`;
}

const open = (aria) => `<svg class="target" viewBox="0 0 ${W} ${H}" role="img" aria-label="${aria}" data-target>
  <defs><clipPath id="tclip"><rect width="${W}" height="${H}" rx="16"/></clipPath></defs>`;

export function drawIrons(shots, pending, hand, pt) {
  const g = IRONS;
  return `${open('Irons target: tap the ball for contact, then the grass for where it finished. The bottom row is the chunk zone.')}
  <g clip-path="url(#tclip)">
    <rect width="${W}" height="${H}" class="t-grass"/>
    <rect width="${W}" height="52" class="t-grass2"/><rect y="104" width="${W}" height="86" class="t-grass2"/><rect y="276" width="${W}" height="42" class="t-grass2"/>
    <rect y="360" width="${W}" height="70" class="t-chunk"/>
    <g class="t-divot"><ellipse cx="44" cy="420" rx="16" ry="4"/><ellipse cx="170" cy="424" rx="20" ry="4"/><ellipse cx="300" cy="420" rx="14" ry="4"/></g>
    <g class="t-line"><line x1="119" y1="0" x2="119" y2="${H}"/><line x1="239" y1="0" x2="239" y2="${H}"/><line x1="0" y1="104" x2="${W}" y2="104"/><line x1="0" y1="276" x2="${W}" y2="276"/></g>
    <line x1="0" y1="360" x2="${W}" y2="360" class="t-edge"/>
  </g>
  <ellipse cx="179" cy="52" rx="11" ry="4" class="t-cup"/><rect x="177.5" y="12" width="3" height="40" class="t-pole"/><path d="M180.5 13 L208 22 L180.5 31 Z" class="t-flag"/>
  <g class="t-lab" text-anchor="middle">
    <text x="60" y="86">Long left</text><text x="179" y="88">Long</text><text x="298" y="86">Long right</text>
    <text x="50" y="196">Left</text><text x="308" y="196">Right</text>
    <text x="60" y="323">Short left</text><text x="179" y="323">Short</text><text x="298" y="323">Short right</text>
    <text x="60" y="400">Chunk left</text><text x="179" y="400">Chunk</text><text x="298" y="400">Chunk right</text>
  </g>
  ${dots(shots, pt)}
  ${ballSvg(g, pending, hand)}
  </svg>`;
}

export function drawWoods(shots, pending, hand, tee, pt) {
  const g = WOODS;
  return `${open('Driver and woods target: fairway in the middle, rough on both sides, out of bounds at the edges. Tap the tee for a skied shot.')}
  <g clip-path="url(#tclip)">
    <rect width="${W}" height="${H}" class="t-rough"/>
    <rect x="110" width="138" height="${H}" class="t-fair"/>
    <rect x="110" width="138" height="52" class="t-fair2"/><rect x="110" y="104" width="138" height="56" class="t-fair2"/><rect x="110" y="214" width="138" height="56" class="t-fair2"/><rect x="110" y="330" width="138" height="50" class="t-fair2"/>
    <rect width="26" height="${H}" class="t-ob"/><rect x="332" width="26" height="${H}" class="t-ob"/>
    <g class="t-line"><line x1="0" y1="104" x2="${W}" y2="104"/><line x1="0" y1="330" x2="${W}" y2="330"/></g>
  </g>
  ${tee ? '<path d="M168 266 L190 266 L184 318 L179 330 L174 318 Z" class="t-tee"/>' : ''}
  <g class="t-lab" text-anchor="middle">
    <text x="13" y="24" font-size="11">OB</text><text x="345" y="24" font-size="11">OB</text>
    <text x="179" y="70">Long</text>
    <text x="68" y="190">Left</text><text x="68" y="208">rough</text>
    <text x="290" y="190">Right</text><text x="290" y="208">rough</text>
    ${tee ? '<text x="222" y="304">Skied</text>' : ''}
    <text x="179" y="388">Short</text>
  </g>
  ${dots(shots, pt)}
  ${ballSvg(g, pending, hand)}
  </svg>`;
}

export function drawGreen(shots, pending, hand, pt) {
  const g = GREEN;
  return `${open('Wedge target: a green with rings at 3 and 10 feet. Tap where the ball finished. The bottom row is the chunk zone.')}
  <g clip-path="url(#tclip)">
    <rect width="${W}" height="${H}" class="t-grass"/>
    <rect x="16" y="12" width="326" height="290" rx="130" class="t-putt t-fringe"/>
    <g class="t-ring"><circle cx="179" cy="136" r="36"/><circle cx="179" cy="136" r="120"/></g>
    <rect y="372" width="${W}" height="58" class="t-chunk"/>
    <line x1="0" y1="372" x2="${W}" y2="372" class="t-edge"/>
    <g class="t-line"><line x1="119" y1="372" x2="119" y2="${H}"/><line x1="239" y1="372" x2="239" y2="${H}"/></g>
  </g>
  <circle cx="179" cy="136" r="9" class="t-cup"/><rect x="177.8" y="48" width="2.5" height="88" class="t-pole-d"/><path d="M180.3 49 L210 58 L180.3 67 Z" class="t-flag"/>
  <g class="t-labd" text-anchor="middle"><text x="179" y="36">Long</text><text x="44" y="141">Left</text><text x="314" y="141">Right</text><text x="179" y="290">Short</text>
    <text x="146" y="182" font-size="13" font-weight="500">3 ft</text><text x="286" y="262" font-size="13" font-weight="500">10 ft</text></g>
  <g class="t-lab" text-anchor="middle"><text x="60" y="406">Chunk left</text><text x="179" y="406">Chunk</text><text x="298" y="406">Chunk right</text></g>
  ${dots(shots, pt)}
  ${ballSvg(g, pending, hand, true)}
  </svg>`;
}

export function drawPutt(putts, brk, pt) {
  const path = brk === 'right' ? 'M179 410 Q 110 262 175 164' : brk === 'left' ? 'M179 410 Q 248 262 183 164' : 'M179 410 L179 166';
  const ghosts = putts.map(p => p.x == null ? '' : `<circle cx="${p.x}" cy="${p.y}" r="5" class="t-ghost-d"/>`).join('')
    + (pt && pt.x != null ? `<circle cx="${pt.x}" cy="${pt.y}" r="10" class="t-mark"/>` : '');
  return `<svg class="target" viewBox="0 0 ${W} ${H}" role="img" aria-label="Putting green from above. Tap the cup for a make, or tap where the ball stopped." data-target>
  <defs><clipPath id="pclip"><rect width="${W}" height="${H}" rx="16"/></clipPath></defs>
  <g clip-path="url(#pclip)">
    <rect width="${W}" height="${H}" class="t-putt"/>
    <rect width="60" height="${H}" class="t-putt2"/><rect x="120" width="60" height="${H}" class="t-putt2"/><rect x="240" width="60" height="${H}" class="t-putt2"/>
    <g class="t-cross"><line x1="179" y1="0" x2="179" y2="${H}"/><line x1="0" y1="150" x2="${W}" y2="150"/></g>
    <g class="t-ring"><circle cx="179" cy="150" r="42"/><circle cx="179" cy="150" r="84"/></g>
    <ellipse cx="179" cy="128" rx="13" ry="22" class="t-pace"/>
    <path d="${path}" class="t-path"/>
  </g>
  ${ghosts}
  <circle cx="179" cy="150" r="14" class="t-cup t-cuprim"/>
  <circle cx="179" cy="410" r="8" class="t-startball"/>
  <g class="t-labd" text-anchor="middle"><text x="179" y="30">Long</text><text x="36" y="155">Left</text><text x="322" y="155">Right</text><text x="240" y="300">Short</text>
    <g font-size="13" font-weight="500"><text x="226" y="122">3 ft</text><text x="268" y="74">6 ft</text><text x="179" y="98">ideal pace</text></g></g>
  </svg>`;
}

export function toViewBox(svg, clientX, clientY) {
  const pt = svg.createSVGPoint();
  pt.x = clientX; pt.y = clientY;
  const m = svg.getScreenCTM();
  if (!m) return { x: 0, y: 0 };
  const p = pt.matrixTransform(m.inverse());
  return { x: Math.round(p.x), y: Math.round(p.y) };
}

// ---------- distance tracker: top-down range view around a target ----------
// 8 px per yard, target ±20 yds visible; the gold line is the target, the band is ±5 yds.
const CARRY = { pxPerYd: 8, top: 10, span: 20, cx: 201 };
const ydToY = (target, yd) => CARRY.top + (target + CARRY.span - yd) * CARRY.pxPerYd;

export function carryHit(target, x, y) {
  const yd = Math.round(target + CARRY.span - (y - CARRY.top) / CARRY.pxPerYd);
  const side = x < 160 ? 'left' : x > 242 ? 'right' : 'line';
  return { carry: Math.max(5, yd), side, lx: Math.round(x) };
}

export function drawCarry(target, ghosts, pt) {
  const lines = [];
  for (let yd = target - 20; yd <= target + 20; yd += 5) {
    const y = ydToY(target, yd);
    const main = yd === target;
    const edge = Math.abs(yd - target) === 5;
    lines.push(main ? '' : `<line x1="44" y1="${y}" x2="358" y2="${y}" stroke="#FFFFFF" stroke-opacity="${edge ? 0.8 : 0.3}" stroke-width="1.5" ${edge ? 'stroke-dasharray="6 5"' : ''}/>`);
    lines.push(`<text x="36" y="${y + 4}" text-anchor="end" font-size="${main ? 15 : 13}" font-weight="${main ? 700 : 500}" fill="${main ? '#E2B65A' : '#FFFFFF'}" font-family="'JetBrains Mono', monospace">${yd}</text>`);
  }
  const ty = ydToY(target, target);
  const dots = ghosts.map(g => {
    const y = ty - g.dy * CARRY.pxPerYd;
    return y < 4 || y > 336 ? '' : `<circle cx="${g.lx}" cy="${y}" r="5" class="t-ghost"/>`;
  }).join('');
  const mark = pt ? `<circle cx="${pt.lx}" cy="${ydToY(target, pt.carry)}" r="12" class="t-mark"/>` : '';
  return `<svg class="target" viewBox="0 0 358 340" role="img" aria-label="Range from above with yardage lines around the ${target}-yard target. Tap where the ball landed." data-target>
  <defs><clipPath id="cclip"><rect width="358" height="340" rx="16"/></clipPath></defs>
  <g clip-path="url(#cclip)"><rect width="358" height="340" class="t-grass"/>
  <rect x="0" y="${ydToY(target, target + 5)}" width="358" height="${10 * CARRY.pxPerYd}" class="t-band"/></g>
  <line x1="${CARRY.cx}" y1="0" x2="${CARRY.cx}" y2="340" stroke="#FFFFFF" stroke-opacity=".3" stroke-width="1.5" stroke-dasharray="4 6"/>
  ${lines.join('')}
  <line x1="44" y1="${ty}" x2="358" y2="${ty}" stroke="#E2B65A" stroke-width="3"/>
  <ellipse cx="${CARRY.cx}" cy="${ty}" rx="12" ry="5" class="t-cup"/><rect x="${CARRY.cx - 1.5}" y="${ty - 42}" width="3" height="42" class="t-pole"/><path d="M${CARRY.cx + 1.5} ${ty - 41} L${CARRY.cx + 29} ${ty - 32} L${CARRY.cx + 1.5} ${ty - 23} Z" fill="#E2B65A"/>
  <text x="56" y="${ydToY(target, target - 5) + 18}" class="t-lab" font-size="13">±5 yds counts as on the number</text>
  <g class="t-lab" font-size="13"><text x="64" y="328">Left</text><text x="330" y="328" text-anchor="end">Right</text></g>
  ${dots}${mark}
</svg>`;
}

// ---------- strike map: the clubface split into heel/center/toe by high/mid/low ----------
// Coordinates are stored for a right-hander (hosel on the left); a left-hander's face is mirrored.
export function faceHit(x, y, hand) {
  const xc = hand === 'left' ? 358 - x : x;
  const h = xc < 164 ? 'heel' : xc > 248 ? 'toe' : 'center';
  const v = y < 134 ? 'high' : y > 194 ? 'low' : 'mid';
  return { x: Math.round(xc), y: Math.round(y), h, v };
}

export function drawFace(hand, ghosts, pt) {
  const mx = x => hand === 'left' ? 358 - x : x;
  const flip = hand === 'left' ? 'transform="translate(358 0) scale(-1 1)"' : '';
  const dots = ghosts.map(g => `<circle cx="${mx(g.x)}" cy="${g.y}" r="7" class="t-facedot"/>`).join('');
  const mark = pt ? `<circle cx="${mx(pt.x)}" cy="${pt.y}" r="13" class="t-mark"/>` : '';
  const [l, r] = hand === 'left' ? ['TOE', 'HEEL'] : ['HEEL', 'TOE'];
  return `<svg class="target" viewBox="0 0 358 300" role="img" aria-label="Clubface split into heel, center and toe, high, middle and low. Tap where the mark is." data-target>
  <rect width="358" height="300" rx="16" class="t-faceback"/>
  <g ${flip}>
    <path d="M70 70 L52 26 L72 18 L96 72 Z" class="t-hosel"/>
    <path d="M82 70 Q 80 252 100 262 L 306 262 Q 336 258 334 214 L 322 92 Q 316 64 290 62 L 96 66 Q 84 66 82 70 Z" class="t-face"/>
    <g class="t-groove"><line x1="104" y1="104" x2="312" y2="102"/><line x1="104" y1="128" x2="314" y2="126"/><line x1="104" y1="152" x2="316" y2="150"/><line x1="104" y1="176" x2="318" y2="174"/><line x1="104" y1="200" x2="320" y2="198"/><line x1="106" y1="224" x2="322" y2="222"/></g>
    <rect x="164" y="136" width="84" height="58" class="t-sweet"/>
    <g class="t-zone"><line x1="164" y1="74" x2="164" y2="258"/><line x1="248" y1="70" x2="250" y2="258"/><line x1="90" y1="134" x2="326" y2="132"/><line x1="92" y1="194" x2="330" y2="192"/></g>
  </g>
  <g class="t-facelab" text-anchor="middle"><text x="126" y="288">${l}</text><text x="205" y="288">CENTER</text><text x="290" y="288">${r}</text></g>
  <g class="t-facelab" font-size="11"><text x="10" y="108">HIGH</text><text x="10" y="168">MID</text><text x="10" y="228">LOW</text></g>
  ${dots}${mark}
</svg>`;
}

// ---------- shape glyph: one small flight path for a height and curve ----------
export function shapeGlyph(h, c, hand, cls = '') {
  const H = { high: 44, mid: 36, low: 28 }[h];
  const peak = { high: 6, mid: 12, low: 18 }[h];
  const dir = c === 'none' ? 0 : ((c === 'draw') === (hand !== 'left') ? -1 : 1);
  const sx = 31 - dir * 9, ex = 31 + dir * 17;
  return `<svg width="62" height="${H + 6}" viewBox="0 0 62 ${H + 6}" aria-hidden="true" class="${cls}"><line x1="4" y1="${H + 2}" x2="58" y2="${H + 2}" class="g-ground"/><path d="M${sx} ${H + 2} Q ${sx + dir * -4} ${peak - 4} ${ex} ${peak + 4}" fill="none" class="g-path" stroke-width="3" stroke-linecap="round"/></svg>`;
}
