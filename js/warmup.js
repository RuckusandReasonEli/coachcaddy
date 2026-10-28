// Pre-round warm-up: five 45-second mobility moves with start and move illustrations.
// Figures are drawn in a 200 x 250 box and colored by CSS classes so they follow the day and night themes:
//   k = body (ink), kf/hf = filled torso and head, far = far-side limbs (lighter), ghost = where a limb started,
//   halo/hh = cut-out outline where limbs overlap, arr = motion arrow (gold), shade = ground shadow.

const fig = (label, inner) =>
  `<svg class="wu-fig" viewBox="0 16 200 234" role="img" aria-label="${label}">${inner}</svg>`;
const G = inner => `<g class="k" fill="none" stroke-width="15" stroke-linecap="round" stroke-linejoin="round">${inner}</g>`;
const shade = (cx = 100, rx = 44) => `<ellipse class="shade" cx="${cx}" cy="243" rx="${rx}" ry="5"/>`;
const head = (cx, cy, r, halo = 0) => (halo ? `<circle class="hh" cx="${cx}" cy="${cy}" r="${r + halo}"/>` : '') + `<circle class="hf" cx="${cx}" cy="${cy}" r="${r}"/>`;

// ---------- 1. Twist (front view) ----------
const twistLegsTorso = legs => G(`${legs}
  <path d="M100 74 L100 92" stroke-width="12"/>
  <path class="kf" d="M84 92 L116 92 L111 146 L89 146 Z" stroke-width="12"/>`);

const twistStart = fig('Start: feet together, knees soft, elbows lifted with fists at chest height',
  shade() + twistLegsTorso(`
  <path d="M93 150 L90 193 L94 233"/><path d="M107 150 L110 193 L106 233"/>
  <path d="M94 238 L84 240" stroke-width="11"/><path d="M106 238 L116 240" stroke-width="11"/>`) +
  G(`<path d="M80 95 L54 114 L80 112"/><path d="M120 95 L146 114 L120 112"/>`) +
  head(100, 62, 16));

const twistMove = fig('Move: hips and feet turn to one side while the chest stays facing forward and the arms swing the other way',
  shade() + twistLegsTorso(`
  <path d="M93 150 L102 192 L96 233"/><path d="M107 150 L117 190 L110 233"/>
  <path d="M96 238 L108 240" stroke-width="11"/><path d="M110 238 L122 240" stroke-width="11"/>`) +
  G(`<path class="halo" d="M126 113 L100 108" stroke-width="21"/>
  <path d="M80 95 L56 106 L36 100"/><path d="M120 95 L136 116 L100 108"/>
  <path class="halo" d="M70 150 Q100 174 132 152" stroke-width="10"/>
  <path class="arr" d="M70 150 Q100 174 132 152" stroke-width="4"/>
  <path class="arr" d="M121 153 L132 152 L127 162" stroke-width="4"/>`) +
  head(100, 62, 16));

// ---------- 2. Reverse Flys (front view, hinged) ----------
const flyBase = `
  <path d="M90 148 L82 192 L88 233"/><path d="M110 148 L118 192 L112 233"/>
  <path d="M88 238 L78 240" stroke-width="11"/><path d="M112 238 L122 240" stroke-width="11"/>`;
const flyTorso = `<path class="kf" d="M82 112 L118 112 L112 146 L88 146 Z" stroke-width="12"/>`;
const flyArmsDown = `<path d="M82 116 L79 146 L84 176"/><path d="M118 116 L121 146 L116 176"/>`;

const flyStart = fig('Start: hinged forward at the hips with a flat back, knees soft, arms hanging straight down',
  shade() + G(`${flyBase}${flyTorso}
  <path class="halo" d="M80 142 L84 176" stroke-width="21"/><path class="halo" d="M120 142 L116 176" stroke-width="21"/>
  ${flyArmsDown}`) + head(100, 102, 15, 4));

const flyMove = fig('Move: staying hinged, arms sweep out wide and up with thumbs pointing to the sky',
  shade() + G(`${flyBase}
  <g class="ghost">${flyArmsDown}</g>${flyTorso}
  <path class="arr" d="M74 170 Q38 150 34 112" stroke-width="4"/><path class="arr" d="M29 122 L34 112 L40 121" stroke-width="4"/>
  <path class="arr" d="M126 170 Q162 150 166 112" stroke-width="4"/><path class="arr" d="M171 122 L166 112 L160 121" stroke-width="4"/>
  <path d="M82 116 L58 98 L38 78"/><path d="M118 116 L142 98 L162 78"/>
  <path d="M38 78 L36 64" stroke-width="9"/><path d="M162 78 L164 64" stroke-width="9"/>`) + head(100, 102, 15, 4));

// ---------- 3. Body Waves (side view, facing right) ----------
const waveStart = fig('Start, side view: knees bent, back rounded forward, arms reaching down and back toward the ground',
  shade(108) + G(`
  <path class="far" d="M88 156 L112 196 L98 233"/><path class="far" d="M97 238 L117 240" stroke-width="11"/>
  <path class="far" d="M122 148 L120 184 L108 214"/>
  <path d="M84 158 L116 192 L102 233"/><path d="M100 238 L122 240" stroke-width="11"/>
  <path d="M84 156 Q90 112 128 142" stroke-width="30"/>`) + head(146, 164, 15) + G(`
  <path class="halo" d="M126 172 L116 214" stroke-width="21"/>
  <path d="M128 148 L126 184 L116 216"/>
  <path class="arr" d="M54 206 C36 168 78 136 58 92" stroke-width="4"/>
  <path class="arr" d="M57 103 L58 92 L67 98" stroke-width="4"/>`));

const waveMove = fig('Move, side view: rolled up to standing tall, hips forward, chest lifted, arms reaching overhead',
  shade(108) + G(`
  <path class="far" d="M96 96 L80 64 L70 32"/>
  <path class="far" d="M100 150 L103 192 L97 233"/><path class="far" d="M96 238 L116 240" stroke-width="11"/>
  <path d="M104 150 L107 192 L102 233"/><path d="M100 238 L122 240" stroke-width="11"/>
  <path d="M104 150 Q114 120 98 94" stroke-width="30"/>`) + head(104, 72, 15) + G(`
  <path class="halo" d="M90 70 L78 34" stroke-width="21"/>
  <path d="M100 96 L86 62 L76 30"/>
  <path class="arr" d="M152 212 C172 172 132 142 152 98" stroke-width="4"/>
  <path class="arr" d="M143 104 L152 98 L153 109" stroke-width="4"/>`));

// ---------- 4. Deep Squat Calf Raises (side view, facing right) ----------
const squatStart = fig('Start, side view: deep squat with feet flat, chest up, hands together in front of the chin',
  shade(112) + G(`
  <path class="far" d="M84 200 L134 184 L112 231"/><path class="far" d="M104 238 L134 239" stroke-width="11"/>
  <path class="far" d="M96 144 L120 166 L124 136"/>
  <path d="M80 204 L128 186 L106 232"/><path d="M98 239 L128 240" stroke-width="11"/>
  <path d="M80 202 L98 142" stroke-width="30"/>`) + head(106, 116, 15) + G(`
  <path class="halo" d="M108 154 L124 168" stroke-width="21"/>
  <path d="M98 146 L124 168 L126 138"/>`) + head(126, 134, 8));

const squatMove = fig('Move, side view: staying low in the squat and rising onto the balls of the feet with heels lifted',
  shade(112) + G(`
  <path class="ghost" d="M98 239 L128 240" stroke-width="11"/>
  <path class="far" d="M88 192 L136 178 L118 218"/><path class="far" d="M112 221 L140 239" stroke-width="11"/>
  <path class="far" d="M98 134 L122 156 L126 126"/>
  <path d="M84 196 L130 180 L112 220"/><path d="M106 223 L134 240" stroke-width="11"/>
  <path d="M84 194 L100 134" stroke-width="30"/>`) + head(108, 108, 15) + G(`
  <path class="halo" d="M110 142 L126 158" stroke-width="21"/>
  <path d="M100 136 L126 158 L128 128"/>
  <path class="halo" d="M88 234 L88 202" stroke-width="10"/>
  <path class="arr" d="M88 234 L88 202" stroke-width="4"/>
  <path class="arr" d="M80 210 L88 200 L96 210" stroke-width="4"/>`) + head(128, 124, 8));

// ---------- 5. Standing Thoracic Rotations (front view, wide stance) ----------
const wideLegs = `
  <path d="M92 150 L72 192 L54 232"/><path d="M108 150 L128 192 L146 232"/>
  <path d="M54 238 L42 240" stroke-width="11"/><path d="M146 238 L158 240" stroke-width="11"/>`;

const rotStart = fig('Start: wide stance, folded forward at the hips, head and both hands hanging toward the floor',
  shade(100, 66) + G(`${wideLegs}
  <path class="kf" d="M88 150 L112 150 L118 180 L82 180 Z" stroke-width="12"/>
  <path d="M84 182 L82 205 L82 228"/><path d="M116 182 L118 205 L118 228"/>`) + head(100, 200, 12, 3));

const rotMove = fig('Move: one hand reaches to the opposite foot while the chest rotates open and the other arm reaches straight up',
  shade(100, 66) + G(`${wideLegs}
  <path d="M100 146 L128 164" stroke-width="32"/>
  <path d="M134 154 L132 106 L130 58"/>`) + head(153, 180, 14) + G(`
  <path class="halo" d="M127 186 L146 226" stroke-width="21"/>
  <path d="M122 174 L136 202 L146 226"/>
  <path class="arr" d="M170 150 Q178 96 146 70" stroke-width="4"/>
  <path class="arr" d="M150 80 L146 70 L157 72" stroke-width="4"/>`));

// ---------- the routine ----------
export const WARMUP = [
  {
    id: 'twist', name: 'Twist', targets: ['Hips', 'Obliques'],
    why: 'Builds hip and shoulder separation, a key source of rotational speed in your swing.',
    cues: [
      'Stand tall, feet together, knees soft. Lift your elbows and hold your fists at chest height.',
      'Hop lightly and turn your hips and feet to one side while your chest keeps facing forward.',
      'Turn back the other way. Keep a quick, steady rhythm for the full 45 seconds.',
    ],
    tip: 'Let your lower body do the turning. Your shoulders stay quiet and level.',
    frames: [{ label: 'Start', svg: twistStart }, { label: 'Turn hips', svg: twistMove }],
  },
  {
    id: 'flys', name: 'Reverse Flys', targets: ['Upper back', 'Rear shoulders'],
    why: 'Wakes up the posture muscles that help you hold your spine angle through impact.',
    cues: [
      'Hinge forward at the hips with a flat back and soft knees. Let your arms hang straight down.',
      'Sweep your arms out wide and up, thumbs to the sky, squeezing your shoulder blades together.',
      'Lower slowly with control and repeat for the full 45 seconds.',
    ],
    tip: 'Keep your neck long and your eyes on the ground a few feet ahead. Stay hinged as the arms rise.',
    frames: [{ label: 'Hinge', svg: flyStart }, { label: 'Raise', svg: flyMove }],
  },
  {
    id: 'waves', name: 'Body Waves', targets: ['Spine', 'Hamstrings', 'Chest'],
    why: 'Warms up your whole back line so you can coil and extend freely.',
    cues: [
      'Bend your knees and fold forward. Let your arms reach down and back toward the ground.',
      'Roll up slowly, one section of your spine at a time, driving your hips forward as you rise.',
      'Finish tall with arms overhead and chest lifted, then flow back down into the fold.',
    ],
    tip: 'Keep it smooth and continuous, like a wave. No snapping or forcing at the top.',
    frames: [{ label: 'Fold', svg: waveStart }, { label: 'Roll up', svg: waveMove }],
  },
  {
    id: 'squat', name: 'Deep Squat Calf Raises', targets: ['Ankles', 'Calves', 'Hips'],
    why: 'Loosens ankles and hips for a stable, athletic setup.',
    cues: [
      'Sit into a deep squat, feet flat, with your hands together in front of your chin.',
      'Stay low and press up onto the balls of your feet, lifting your heels.',
      'Lower your heels with control and repeat for the full 45 seconds.',
    ],
    tip: 'Keep your chest up and your knees tracking over your toes. Go only as deep as you can with a flat back.',
    frames: [{ label: 'Squat', svg: squatStart }, { label: 'Rise', svg: squatMove }],
  },
  {
    id: 'rotations', name: 'Standing Thoracic Rotations', targets: ['Mid back', 'Hamstrings', 'Shoulders'],
    why: 'Frees up mid back rotation for a fuller, easier backswing turn.',
    cues: [
      'Take a wide stance and fold forward, letting both hands hang toward the floor.',
      'Reach one hand to the opposite foot and rotate your chest open, sending the other arm to the sky.',
      'Return to center and switch sides with each rep.',
    ],
    tip: 'Follow your top hand with your eyes to open up the rotation.',
    frames: [{ label: 'Fold', svg: rotStart }, { label: 'Rotate open', svg: rotMove }],
  },
];

export const WARMUP_WORK = 45;   // seconds per move
export const WARMUP_READY = 3;   // get-ready countdown between moves in routine mode
