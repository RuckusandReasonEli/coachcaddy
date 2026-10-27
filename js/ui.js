// Shared markup: glyphs, science diagrams and small helpers.

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function insignia(size = 40, label = true) {
  return `<svg class="insignia" width="${size}" height="${size}" viewBox="0 0 64 64" ${label ? 'role="img" aria-label="Coach Caddy insignia"' : 'aria-hidden="true"'}>
  <circle cx="32" cy="32" r="29" fill="none" stroke="currentColor" stroke-width="2.5"/><circle cx="32" cy="32" r="24" fill="none" stroke="currentColor" stroke-width="1" stroke-opacity="0.6"/>
  <g stroke="currentColor" stroke-linecap="round"><line x1="19" y1="15" x2="43" y2="45" stroke-width="2.6"/><line x1="45" y1="15" x2="21" y2="45" stroke-width="2.6"/><line x1="19" y1="15" x2="22.5" y2="19.4" stroke-width="5"/><line x1="45" y1="15" x2="41.5" y2="19.4" stroke-width="5"/></g>
  <path d="M41 43.5 L50 48 L48.5 51.5 L39.5 47.5 Z" fill="currentColor"/><ellipse cx="17" cy="48" rx="6.5" ry="4" transform="rotate(-25 17 48)" fill="currentColor"/><circle cx="32" cy="50" r="3.6" fill="currentColor"/></svg>`;
}

// Bold cut-out glyphs. Set color with CSS `color`, and the cut-out color with `--cut`.
export function caddyGlyph(size, cls = '', cut = 'var(--bg)') {
  return `<svg class="glyph ${cls}" style="--cut:${cut}" width="${size}" height="${size}" viewBox="0 0 120 120" aria-hidden="true"><g fill="currentColor">
  <g transform="rotate(18 92 64)"><rect x="80" y="50" width="24" height="44" rx="5"/></g>
  <g stroke="currentColor" stroke-width="4" stroke-linecap="round"><line x1="86" y1="56" x2="84" y2="30"/><line x1="94" y1="58" x2="100" y2="34"/><line x1="100" y1="64" x2="112" y2="48"/></g>
  <rect x="76" y="22" width="13" height="9" rx="4" transform="rotate(-30 82 26)"/><rect x="95" y="27" width="13" height="9" rx="4" transform="rotate(-20 101 31)"/><rect x="106" y="40" width="12" height="9" rx="4" transform="rotate(-10 112 44)"/>
  <path d="M38 32 Q38 12 60 12 Q82 12 82 32 Z"/><rect x="36" y="34" width="48" height="7" rx="3"/>
  <path d="M41 43 L79 43 L79 54 Q79 72 60 72 Q41 72 41 54 Z"/><rect x="52" y="70" width="16" height="11"/>
  <path class="cut" d="M14 122 L14 100 Q14 82 36 80 L84 80 Q106 82 106 100 L106 122 Z" stroke-width="4"/></g>
  <g class="cut" fill="none" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"><path d="M40 82 L50 94 L60 88 L70 94 L80 82"/><path d="M48 92 Q60 108 72 92"/><line x1="30" y1="102" x2="30" y2="120"/><line x1="90" y1="102" x2="90" y2="120"/></g></svg>`;
}

export function golferGlyph(size, cls = '', cut = 'var(--bg)') {
  return `<svg class="glyph ${cls}" style="--cut:${cut}" width="${size}" height="${size}" viewBox="0 0 120 120" aria-hidden="true"><g fill="currentColor">
  <circle cx="64" cy="22" r="13"/><path d="M68 14 L88 22 L86 27 L66 20 Z"/><path class="cutf" d="M54 22 Q56 35 68 35 Q74 31 73 24 Z"/>
  <path d="M40 40 Q52 33 68 41 L62 78 L36 78 Q30 60 40 40 Z"/><path d="M36 78 L62 78 L60 116 L50 116 L50 94 L48 116 L34 116 Z"/>
  <path class="cut" d="M58 42 L70 74 L63 76 L51 47 Z" stroke-width="3"/><circle cx="98" cy="92" r="7.5"/></g>
  <g stroke="currentColor" stroke-linecap="round"><line x1="66" y1="74" x2="88" y2="110" stroke-width="4.5"/><line x1="86" y1="110" x2="101" y2="106" stroke-width="6"/></g></svg>`;
}

export function bagGlyph(size, cls = '', cut = 'var(--bg)') {
  return `<svg class="glyph ${cls}" style="--cut:${cut}" width="${size}" height="${size}" viewBox="0 0 120 120" aria-hidden="true">
  <g stroke="currentColor" stroke-width="5" stroke-linecap="round"><line x1="48" y1="40" x2="44" y2="18"/><line x1="60" y1="40" x2="60" y2="12"/><line x1="72" y1="40" x2="78" y2="18"/></g>
  <g fill="currentColor"><ellipse cx="40" cy="16" rx="8" ry="5.5" transform="rotate(-15 40 16)"/><path d="M53 6 Q62 -1 68 8 L65 16 L55 15 Z"/><ellipse cx="82" cy="16" rx="8" ry="5.5" transform="rotate(15 82 16)"/>
  <rect x="32" y="38" width="56" height="12" rx="2"/><rect x="38" y="54" width="44" height="62" rx="12"/></g>
  <g class="cut" fill="none" stroke-width="4" stroke-linejoin="round"><path d="M48 70 L72 70 L72 90 Q72 102 60 104 Q48 102 48 90 Z"/><line x1="52" y1="78" x2="68" y2="78"/></g></svg>`;
}

export const sunIcon = `<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.5" fill="currentColor"/><g stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="2" x2="12" y2="4.5"/><line x1="12" y1="19.5" x2="12" y2="22"/><line x1="2" y1="12" x2="4.5" y2="12"/><line x1="19.5" y1="12" x2="22" y2="12"/><line x1="4.9" y1="4.9" x2="6.7" y2="6.7"/><line x1="17.3" y1="17.3" x2="19.1" y2="19.1"/><line x1="4.9" y1="19.1" x2="6.7" y2="17.3"/><line x1="17.3" y1="6.7" x2="19.1" y2="4.9"/></g></svg>`;
export const moonIcon = `<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5 A8 8 0 1 1 9.5 4 A6.5 6.5 0 0 0 20 14.5 Z" fill="currentColor"/></svg>`;
export const lockIcon = `<svg width="14" height="16" viewBox="0 0 14 16" aria-hidden="true"><rect x="1" y="7" width="12" height="9" rx="2" fill="currentColor"/><path d="M4 7 V5 a3 3 0 0 1 6 0 V7" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>`;
export const checkOn = `<svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true"><circle cx="13" cy="13" r="12" class="f-brand"/><path d="M7 13.5 L11 17 L19 9" fill="none" class="s-onbrand" stroke-width="2.5"/></svg>`;
export const checkOff = `<svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true"><circle cx="13" cy="13" r="11" fill="none" class="s-line" stroke-width="2"/></svg>`;

// ---------- science diagrams ----------

export const science = {
  flight: {
    title: 'Ball-flight laws',
    text: 'Start line follows the <b class="t-gold">face</b>. Curve follows face versus <b class="t-brand">path</b>.',
    svg: `<svg width="128" height="112" viewBox="0 0 128 112" role="img" aria-label="Top-down diagram: the face points right of the target, the path less so, and the ball curves right.">
      <line x1="54" y1="104" x2="54" y2="6" class="s-ink2" stroke-width="1.5" stroke-dasharray="4 4"/>
      <path d="M54 96 Q 64 40 98 10" fill="none" class="s-ink" stroke-width="2" stroke-dasharray="2 5" stroke-linecap="round"/>
      <line x1="44" y1="112" x2="58" y2="70" class="s-brand" stroke-width="3" stroke-linecap="round"/><path d="M58 70 L52 76 L61 78 Z" class="f-brand"/>
      <line x1="54" y1="96" x2="74" y2="58" class="s-gold" stroke-width="3" stroke-linecap="round"/><path d="M74 58 L66 62 L75 67 Z" class="f-gold"/>
      <circle cx="54" cy="96" r="6" class="f-ball s-ink" stroke-width="1.5"/>
      <text x="78" y="62" font-size="12" font-weight="700" class="f-gold">face</text><text x="8" y="80" font-size="12" font-weight="700" class="f-brand">path</text><text x="62" y="14" font-size="12" class="f-ink2">target</text></svg>`,
  },
  facepath: {
    title: 'Why it went right',
    text: 'Your misses match a face <b>open to the path</b>: starts right, curves right.',
    svg: `<svg width="128" height="104" viewBox="0 0 128 104" role="img" aria-label="Top-down diagram: the path points at the target, the face points right, so the ball starts right and curves right.">
      <line x1="50" y1="100" x2="50" y2="4" class="s-ink2" stroke-width="1.5" stroke-dasharray="4 4"/>
      <path d="M50 90 Q 60 40 100 12" fill="none" class="s-ink" stroke-width="2" stroke-dasharray="2 5" stroke-linecap="round"/>
      <line x1="50" y1="104" x2="50" y2="66" class="s-brand" stroke-width="3" stroke-linecap="round"/><path d="M50 62 L45 70 L55 70 Z" class="f-brand"/>
      <line x1="50" y1="90" x2="68" y2="56" class="s-gold" stroke-width="3" stroke-linecap="round"/><path d="M70 52 L61 57 L69 62 Z" class="f-gold"/>
      <circle cx="50" cy="90" r="6" class="f-ball s-ink" stroke-width="1.5"/>
      <text x="72" y="58" font-size="12" font-weight="700" class="f-gold">face</text><text x="10" y="80" font-size="12" font-weight="700" class="f-brand">path</text></svg>`,
  },
  lowpoint: {
    title: 'Low point',
    text: 'Ball first, then turf. Good iron strikes bottom out ahead of the ball.',
    svg: `<svg width="140" height="80" viewBox="0 0 140 80" role="img" aria-label="Side view: the swing arc bottoms out just ahead of the ball and the divot starts after the ball.">
      <path d="M6 6 Q 74 106 136 8" fill="none" class="s-brand" stroke-width="2.5" stroke-dasharray="3 5" stroke-linecap="round"/>
      <line x1="0" y1="62" x2="140" y2="62" class="s-ink2" stroke-width="1.5"/><ellipse cx="86" cy="64" rx="14" ry="3.5" class="f-chunk"/>
      <circle cx="56" cy="55" r="7" class="f-ball s-ink" stroke-width="1.5"/><line x1="72" y1="44" x2="72" y2="70" class="s-gold" stroke-width="2"/>
      <text x="76" y="78" font-size="11" font-weight="700" class="f-goldink">low point</text></svg>`,
  },
  trajectories: `<svg width="132" height="62" viewBox="0 0 132 62" role="img" aria-label="Three ball flights: punch lowest, full swing in the middle, high tallest.">
      <line x1="4" y1="56" x2="128" y2="56" class="s-ink2" stroke-width="1.5"/>
      <path d="M8 56 Q 60 36 124 54" fill="none" class="s-ink2" stroke-width="2" stroke-dasharray="2 4"/>
      <path d="M8 56 Q 62 6 124 54" fill="none" class="s-gold" stroke-width="3"/>
      <path d="M8 56 Q 56 -18 120 54" fill="none" class="s-ink2" stroke-width="2" stroke-dasharray="2 4"/>
      <circle cx="8" cy="54" r="3.5" class="f-ball s-ink" stroke-width="1"/></svg>`,
  break: {
    title: 'Break and speed',
    text: 'Aim above the cup. Putts break most as they slow near the hole.',
    svg: `<svg width="132" height="92" viewBox="0 0 132 92" role="img" aria-label="Breaking putt: aim left of the cup, the ball curves right into the hole as it slows.">
      <rect width="132" height="92" rx="12" class="f-putt"/><line x1="56" y1="84" x2="34" y2="12" class="s-puttink" stroke-opacity="0.55" stroke-width="1.5" stroke-dasharray="3 4"/>
      <circle cx="34" cy="12" r="4" fill="none" class="s-gold" stroke-width="2.5"/><path d="M56 84 Q 34 34 92 18" fill="none" class="s-brand" stroke-width="2.5" stroke-linecap="round"/>
      <circle cx="94" cy="17" r="6" fill="#0B1510"/><circle cx="56" cy="84" r="4.5" fill="#FFFFFF" stroke="#0B1510" stroke-width="1"/>
      <text x="40" y="30" font-size="11" font-weight="700" class="f-puttink">aim</text></svg>`,
  },
  speed: {
    title: 'Capture speed',
    text: 'Pace that would roll about 17 in past holes the most putts. Short never goes in.',
    svg: `<svg width="120" height="104" viewBox="0 0 120 104" role="img" aria-label="Cup with a gold zone about 17 inches past it marking ideal pace.">
      <rect width="120" height="104" rx="12" class="f-putt"/><ellipse cx="60" cy="36" rx="12" ry="20" class="f-gold" fill-opacity="0.55"/>
      <circle cx="60" cy="56" r="9" fill="#0B1510" stroke="#FFFFFF" stroke-width="2"/><line x1="60" y1="100" x2="60" y2="68" stroke="#FFFFFF" stroke-width="2" stroke-dasharray="3 4"/>
      <g fill="#FFFFFF" stroke="#0B1510" stroke-width="1"><circle cx="66" cy="78" r="4"/><circle cx="52" cy="84" r="4"/></g>
      <text x="76" y="30" font-size="12" font-weight="700" class="f-puttink">17 in</text></svg>`,
  },
};

export function scienceCard(key) {
  const s = science[key];
  return `<div class="science">${s.svg}<div class="science-text"><span class="lbl">${s.title}</span><span>${s.text}</span></div></div>`;
}

// Small drill glyphs for list rows.
export function drillGlyph(kind) {
  const box = inner => `<svg width="42" height="42" viewBox="0 0 42 42" aria-hidden="true"><rect width="42" height="42" rx="10" class="${kind.startsWith('p') ? 'f-putt' : 'f-sf2'}"/>${inner}</svg>`;
  const g = {
    gate: '<rect x="11" y="12" width="4" height="18" rx="2" class="f-ink2"/><rect x="27" y="12" width="4" height="18" rx="2" class="f-ink2"/><circle cx="21" cy="26" r="4" class="f-gold"/><path d="M21 21 L21 8" class="s-brand" stroke-width="2" stroke-dasharray="2 3"/>',
    line: '<line x1="6" y1="28" x2="36" y2="28" class="s-ink2" stroke-width="1.5"/><line x1="19" y1="20" x2="19" y2="34" class="s-ink" stroke-width="2"/><ellipse cx="26" cy="29" rx="6" ry="2.5" class="f-chunk"/><circle cx="14" cy="24" r="3.5" class="f-gold"/>',
    feet: '<rect x="13" y="12" width="7" height="18" rx="3.5" class="f-ink2"/><rect x="22" y="12" width="7" height="18" rx="3.5" class="f-ink2"/><circle cx="21" cy="35" r="3" class="f-gold"/>',
    split: '<line x1="12" y1="8" x2="30" y2="34" class="s-ink2" stroke-width="2.5"/><circle cx="15" cy="12" r="3.5" class="f-brand"/><circle cx="21" cy="21" r="3.5" class="f-gold"/>',
    clock: '<circle cx="21" cy="21" r="12" fill="none" class="s-ink2" stroke-width="2"/><line x1="21" y1="21" x2="11" y2="21" class="s-gold" stroke-width="2.5"/><line x1="21" y1="21" x2="31" y2="21" class="s-brand" stroke-width="2.5"/>',
    pause: '<rect x="14" y="11" width="5" height="20" rx="2" class="f-ink2"/><rect x="23" y="11" width="5" height="20" rx="2" class="f-gold"/>',
    face: '<rect x="8" y="13" width="26" height="16" rx="6" class="f-ink2"/><circle cx="21" cy="21" r="4" class="f-gold"/>',
    align: '<line x1="8" y1="30" x2="34" y2="12" class="s-ink2" stroke-width="2.5"/><line x1="8" y1="34" x2="34" y2="16" class="s-gold" stroke-width="2.5"/>',
    tempo: '<path d="M6 28 Q 14 12 21 28 T 36 28" fill="none" class="s-gold" stroke-width="2.5"/>',
    ladder: '<rect x="8" y="26" width="6" height="8" rx="1.5" class="f-ink2"/><rect x="18" y="19" width="6" height="15" rx="1.5" class="f-ink2"/><rect x="28" y="10" width="6" height="24" rx="1.5" class="f-gold"/>',
    fairway: '<rect x="15" y="4" width="12" height="34" rx="3" class="f-fair"/><circle cx="21" cy="14" r="3.5" class="f-ball s-ink" stroke-width="1"/>',
    traj: '<path d="M6 34 Q 21 4 36 32" fill="none" class="s-gold" stroke-width="2.5"/><path d="M6 34 Q 21 22 36 32" fill="none" class="s-ink2" stroke-width="2" stroke-dasharray="2 3"/>',
    nine: '<g class="f-ink2"><circle cx="12" cy="12" r="3"/><circle cx="21" cy="12" r="3"/><circle cx="30" cy="12" r="3"/><circle cx="12" cy="21" r="3"/><circle cx="30" cy="21" r="3"/><circle cx="12" cy="30" r="3"/><circle cx="21" cy="30" r="3"/><circle cx="30" cy="30" r="3"/></g><circle cx="21" cy="21" r="3.5" class="f-gold"/>',
    flag: '<rect x="20" y="8" width="2.5" height="26" class="f-ink2"/><path d="M22.5 8 L33 12 L22.5 16 Z" class="f-gold"/><ellipse cx="21" cy="34" rx="9" ry="3" class="f-fair"/>',
    routine: '<circle cx="21" cy="21" r="12" fill="none" class="s-gold" stroke-width="2.5" stroke-dasharray="6 4"/><circle cx="21" cy="21" r="3.5" class="f-ink2"/>',
    pgate: '<rect x="13" y="14" width="3" height="10" rx="1.5" class="f-puttink"/><rect x="26" y="14" width="3" height="10" rx="1.5" class="f-puttink"/><circle cx="21" cy="30" r="3.5" fill="#FFFFFF" stroke="#0B1510" stroke-width="1"/><circle cx="21" cy="8" r="3.5" fill="#0B1510"/>',
    pclock: '<circle cx="21" cy="21" r="4" fill="#0B1510"/><g fill="#FFFFFF" stroke="#0B1510" stroke-width="1"><circle cx="21" cy="8" r="2.5"/><circle cx="30" cy="12" r="2.5"/><circle cx="34" cy="21" r="2.5"/><circle cx="30" cy="30" r="2.5"/><circle cx="21" cy="34" r="2.5"/><circle cx="12" cy="30" r="2.5"/><circle cx="8" cy="21" r="2.5"/><circle cx="12" cy="12" r="2.5"/></g>',
    pladder: '<g fill="#FFFFFF" stroke="#0B1510" stroke-width="1"><circle cx="21" cy="34" r="3"/><circle cx="21" cy="25" r="3"/><circle cx="21" cy="16" r="3"/></g><circle cx="21" cy="7" r="3.5" class="f-gold"/>',
    plag: '<line x1="6" y1="10" x2="36" y2="10" class="s-puttink" stroke-width="2"/><line x1="21" y1="36" x2="21" y2="16" class="s-puttink" stroke-width="1.5" stroke-dasharray="2 3"/><circle cx="21" cy="14" r="3.5" class="f-gold"/>',
    pworld: '<circle cx="21" cy="21" r="4" fill="#0B1510"/><g fill="none" class="s-puttink" stroke-width="1.5"><path d="M8 8 Q 12 18 17 18"/><path d="M34 8 Q 30 18 25 18"/><path d="M8 34 Q 12 24 17 24"/><path d="M34 34 Q 30 24 25 24"/></g>',
  }[kind] || '';
  return box(g);
}

export function toast(msg) {
  let t = document.getElementById('toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._h);
  t._h = setTimeout(() => t.classList.remove('show'), 2200);
}

// ---------- YouTube drill search ----------
// Query: drill name + "golf". Adds "putting" for putting drills and "drill" when the name lacks it,
// so "Slow motion" finds the drill rather than pro swing videos.
export function ytQuery(d) {
  const putt = d.putts != null && !/putt/i.test(d.name);
  const drill = /drill/i.test(d.name) ? '' : ' drill';
  return `${d.name}${putt ? ' putting' : ''}${drill} golf`;
}
export function ytWebUrl(q) { return 'https://www.youtube.com/results?search_query=' + encodeURIComponent(q); }

const playIcon = `<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><circle cx="7" cy="7" r="7" class="f-brand"/><path d="M5.4 4.2 L10 7 L5.4 9.8 Z" class="f-onbrand"/></svg>`;

export function ytLink(d, compact = false) {
  const q = ytQuery(d);
  return `<a class="yt${compact ? ' icon-only' : ''}" href="${ytWebUrl(q)}" target="_blank" rel="noopener" data-yt="${esc(q)}" aria-label="Search YouTube for ${esc(q)}">${playIcon}${compact ? '' : '<span>YouTube</span>'}</a>`;
}

// iPhone/iPad: open the YouTube app directly, fall back to the website if the app isn't installed.
// Everywhere else the normal link opens (Android hands youtube.com links to the app).
export function openYouTube(q) {
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (!ios) return false;
  const web = ytWebUrl(q);
  let left = false;
  const gone = () => { left = true; };
  document.addEventListener('visibilitychange', gone, { once: true });
  window.addEventListener('pagehide', gone, { once: true });
  window.location.href = 'youtube://www.youtube.com/results?search_query=' + encodeURIComponent(q);
  setTimeout(() => {
    document.removeEventListener('visibilitychange', gone);
    window.removeEventListener('pagehide', gone);
    if (!left && document.visibilityState === 'visible') window.location.href = web;
  }, 1400);
  return true;
}

// ---------- Home tile scenes (flat color blocks, same palette as the app icon) ----------
const trees = (fill) => `<path fill="${fill}" d="M0 30 Q12 14 26 26 Q38 10 54 24 Q68 12 82 26 Q96 8 112 24 Q126 14 140 26 Q156 6 172 24 Q186 12 200 26 Q214 8 230 24 Q244 14 258 26 Q274 6 290 24 Q304 12 318 26 Q334 10 348 24 Q356 18 360 22 L360 0 L0 0 Z"/><rect y="24" width="360" height="12" fill="${fill}"/>`;

// Driving range: tree line, three receding field bands, target greens with flags, range balls.
export function rangeScene() {
  const flag = (x, y, h) => `<line x1="${x}" y1="${y}" x2="${x}" y2="${y - h}" stroke="#F6F3EA" stroke-width="1.4"/><path d="M${x} ${y - h} l${h * .5} ${h * .18} l-${h * .5} ${h * .18}Z" fill="#E2B65A"/>`;
  const balls = [[52,76],[122,70],[204,78],[238,56],[300,66],[334,80],[150,58],[30,62],[270,84]]
    .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.2" fill="#F6F3EA" fill-opacity=".85"/>`).join('');
  return `<svg class="scene" viewBox="0 0 360 220" preserveAspectRatio="none" aria-hidden="true">
  <rect width="360" height="220" fill="#276446"/>
  <rect y="30" width="360" height="44" fill="#3D8762"/>
  <rect y="74" width="360" height="58" fill="#33795A"/>
  ${trees('#173F2F')}
  <ellipse cx="88" cy="50" rx="22" ry="5" fill="#58A47A"/>${flag(88, 50, 12)}
  <ellipse cx="262" cy="48" rx="16" ry="4" fill="#58A47A"/>${flag(262, 48, 10)}
  <ellipse cx="176" cy="70" rx="36" ry="7" fill="#4E9A6E"/>${flag(176, 70, 18)}
  <rect y="132" width="360" height="3" fill="#F6F3EA" fill-opacity=".12"/>
  ${balls}
</svg>`;
}

// Fairway: tree line, rough, striped fairway narrowing to a green and flag, bunker, water down the left.
export function fairwayScene() {
  const L = (y) => 190 - (190 - 112) * (y - 40) / 180, R = (y) => 238 + (330 - 238) * (y - 40) / 180; // fairway edges by depth
  const band = (y1, y2) => `<path d="M${L(y1)} ${y1} L${R(y1)} ${y1} L${R(y2)} ${y2} L${L(y2)} ${y2}Z" fill="#46976A"/>`;
  return `<svg class="scene" viewBox="0 0 360 220" preserveAspectRatio="none" aria-hidden="true">
  <rect width="360" height="220" fill="#23603F"/>
  <path d="M${L(40)} 40 L${R(40)} 40 L${R(220)} 220 L${L(220)} 220Z" fill="#3A8A5F"/>
  ${band(52, 66)}${band(84, 106)}${band(132, 162)}${band(196, 220)}
  <path d="M0 36 L150 36 Q176 40 160 62 Q138 92 112 112 Q72 140 30 150 Q12 154 0 156 Z" fill="#2D6F93"/>
  <path d="M0 36 L150 36 Q176 40 160 62 Q158 64 156 66 Q160 46 138 42 L0 42 Z" fill="#7FC29A" fill-opacity=".45"/>
  <path d="M0 108 Q60 112 112 112 Q72 140 30 150 Q12 154 0 156 Z" fill="#173F5A" fill-opacity=".5"/>
  <g fill="none" stroke="#8CC3DD" stroke-opacity=".5" stroke-width="2" stroke-linecap="round"><path d="M28 70 q10 -4 20 0"/><path d="M84 60 q12 -4 24 0"/><path d="M50 100 q10 -4 20 0"/><path d="M110 84 q8 -3 16 0"/></g>
  ${trees('#173F2F')}
  <ellipse cx="214" cy="42" rx="30" ry="7" fill="#5DAE7C"/>
  <ellipse cx="258" cy="48" rx="12" ry="4" fill="#E8D9A8"/>
  <line x1="216" y1="42" x2="216" y2="20" stroke="#F6F3EA" stroke-width="1.6"/><path d="M216 20 l11 4 l-11 4Z" fill="#E2B65A"/>
</svg>`;
}
