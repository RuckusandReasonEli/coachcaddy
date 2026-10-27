// Coach Caddy reference data: clubs, shot types, drills, lie rules, condition constants.
// Everything here is plain data so it can be tuned without touching app logic.

export const DEFAULT_BAG = [
  { id: 'D',   name: 'Driver',   kind: 'wood',   carry: 230, choked: 218 },
  { id: '3W',  name: '3-wood',   kind: 'wood',   carry: 212, choked: 200 },
  { id: '5H',  name: '5-hybrid', kind: 'hybrid', carry: 185, choked: 176 },
  { id: '5i',  name: '5-iron',   kind: 'iron',   carry: 172, choked: 164 },
  { id: '6i',  name: '6-iron',   kind: 'iron',   carry: 165, choked: 157 },
  { id: '7i',  name: '7-iron',   kind: 'iron',   carry: 155, choked: 148 },
  { id: '8i',  name: '8-iron',   kind: 'iron',   carry: 145, choked: 138 },
  { id: '9i',  name: '9-iron',   kind: 'iron',   carry: 135, choked: 128 },
  { id: 'PW',  name: 'PW',         kind: 'wedge',  carry: 120, choked: 114, loft: 46 },
  { id: '52',  name: 'Gap wedge',  kind: 'wedge',  carry: 105, choked: 99,  loft: 52 },
  { id: '56',  name: 'Sand wedge', kind: 'wedge',  carry: 90,  choked: 85,  loft: 56 },
  { id: '60',  name: 'Flop wedge', kind: 'wedge',  carry: 75,  choked: 70,  loft: 60 },
];

// view: which target the logger shows. win: what counts as success for the recap.
export const MAX_CUSTOM_CLUBS = 5;

export const SHOT_TYPES = [
  { id: 'full',  name: 'Full swing', win: 'Solid and on line' },
  { id: 'tee',   name: 'Tee shot',   win: 'Fairway, no penalty', view: 'woods', tee: true, kinds: ['wood', 'hybrid'] },
  { id: 'draw',  name: 'Draw',       win: 'Curved the planned way', curve: 'left' },
  { id: 'fade',  name: 'Fade',       win: 'Curved the planned way', curve: 'right' },
  { id: 'punch', name: 'Punch',      win: 'Low and solid', height: 'low' },
  { id: 'high',  name: 'High',       win: 'High and on line', height: 'high' },
  { id: 'three', name: '¾ swing',    win: 'Within 5 yds of target', carryPrompt: true },
  { id: 'pitch', name: 'Pitch',      win: 'Inside 10 ft', view: 'green', inside: 10 },
  { id: 'chip',  name: 'Chip',       win: 'Inside 6 ft', view: 'green', inside: 6 },
];

// Range drills. club/type are defaults the logger starts with.
export const RANGE_DRILLS = [
  { id: 'line',     name: 'Line drill',          cat: 'Contact',   trains: 'Low point',      fixes: 'Chunk, thin',   balls: 15, club: '8i', type: 'full',
    how: 'Lay a towel or paint a line. Put the ball just ahead of it and make the divot start after the line.', glyph: 'line' },
  { id: 'feet',     name: 'Feet together',       cat: 'Contact',   trains: 'Balance',        fixes: 'Toe, heel',     balls: 10, club: '7i', type: 'full',
    how: 'Feet touching, half to three-quarter swings. Hold your finish for two seconds.', glyph: 'feet' },
  { id: 'gate',     name: 'Gate drill',          cat: 'Direction', trains: 'Path',           fixes: 'Slice, hook',   balls: 15, club: '7i', type: 'full',
    how: 'Set two tees or headcovers just wider than the club, a few inches past the ball. Swing through the gate.', glyph: 'gate' },
  { id: 'split',    name: 'Split-hand',          cat: 'Direction', trains: 'Plane',          fixes: 'Over the top',  balls: 10, club: '8i', type: 'full',
    how: 'Grip with hands three inches apart. Make smooth half swings to feel the club come from the inside.', glyph: 'split' },
  { id: 'ninethree',name: '9-to-3 swings',       cat: 'Contact',   trains: 'Face control',   fixes: 'Thin, tops',    balls: 15, club: '8i', type: 'three',
    how: 'Backswing to 9 o’clock, finish at 3 o’clock. Compress the ball with hands ahead at impact.', glyph: 'clock' },
  { id: 'pause',    name: 'Pause at the top',    cat: 'Contact',   trains: 'Sequencing',     fixes: 'Pulls, chunk',  balls: 10, club: '7i', type: 'full',
    how: 'Stop for a one-count at the top, then start down with the lower body.', glyph: 'pause' },
  { id: 'spray',    name: 'Impact spray',        cat: 'Contact',   trains: 'Strike spot',    fixes: 'Shanks',        balls: 10, club: '7i', type: 'full',
    how: 'Spray foot powder on the face. Check the mark after every ball and log heel or toe honestly.', glyph: 'face' },
  { id: 'align',    name: 'Alignment station',   cat: 'Direction', trains: 'Aim, ball spot', fixes: 'Push, pull',    balls: 10, club: '7i', type: 'full',
    how: 'One stick at your toes, one for ball position. Pick a target every ball.', glyph: 'align' },
  { id: 'slomo',    name: 'Slow motion',         cat: 'Contact',   trains: 'Tempo',          fixes: 'Rushing',       balls: 10, club: '7i', type: 'three',
    how: 'Swing at half speed with full positions. Then two normal swings with the same feel.', glyph: 'tempo' },
  { id: 'ladder',   name: 'Wedge ladder',        cat: 'Distance',  trains: 'Distance',       fixes: 'Long, short',   balls: 15, club: '56', type: 'pitch',
    how: 'Pick 50, 60, 70 yds and up. Land each ball a step past the last.', glyph: 'ladder' },
  { id: 'clock',    name: 'Clock wedges',        cat: 'Distance',  trains: 'Partial swings', fixes: 'Gaps',          balls: 12, club: '52', type: 'three',
    how: 'Three backswing lengths (7:30, 9, 10:30). Log carry to learn each number.', glyph: 'clock' },
  { id: 'gapping',  name: 'Choke-down gapping',  cat: 'Distance',  trains: 'True carries',   fixes: 'Wrong club',    balls: 12, club: '7i', type: 'three',
    how: 'Alternate full and gripped-down an inch. Log carry yards so My bag learns your real numbers.', glyph: 'ladder' },
  { id: 'fairway',  name: 'Fairway finder',      cat: 'Direction', trains: 'Dispersion',     fixes: 'Penalties',     balls: 10, club: 'D',  type: 'tee',
    how: 'Pick two range flags as fairway edges. Full routine every ball.', glyph: 'fairway' },
  { id: 'punch',    name: 'Punch shot',          cat: 'Shape',     trains: 'Trajectory',     fixes: 'Ballooning',    balls: 10, club: '7i', type: 'punch',
    how: 'Ball back, hands ahead, abbreviated finish. Keep it under an imaginary branch.', glyph: 'traj' },
  { id: 'nine',     name: '9-shot drill',        cat: 'Shape',     trains: 'Shot shape',     fixes: 'No curve',      balls: 9,  club: '7i', type: 'draw',
    how: 'Cycle high, mid, low with draw, straight, fade. Change the shot type as you go.', glyph: 'nine' },
  { id: 'onedist',  name: 'One yardage, 3 clubs',cat: 'Distance',  trains: 'Feel',           fixes: 'One shot only', balls: 9,  club: '8i', type: 'three',
    how: 'Same target with three clubs: full, three-quarter and punch.', glyph: 'traj' },
  { id: 'play9',    name: 'Play 9 on the range', cat: 'Transfer',  trains: 'Random practice',fixes: 'Range-to-course gap', balls: 18, club: 'D', type: 'tee',
    how: 'Imagine a real 9 holes. Change club and target every ball, full routine each time.', glyph: 'flag' },
  { id: 'routine',  name: 'Pre-shot routine',    cat: 'Transfer',  trains: 'Commitment',     fixes: 'Indecision',    balls: 10, club: '7i', type: 'full',
    how: 'Same routine, same timing, every ball. If you step off, start the routine over.', glyph: 'routine' },
];

export const PUTT_DRILLS = [
  { id: 'pgate',   name: 'Gate drill',         cat: 'Line',     trains: 'Start line',       dist: 5,  brk: 'straight', putts: 10, glyph: 'pgate',
    how: 'Two tees just wider than the ball, a foot in front. Roll it through the gate.' },
  { id: 'pclock',  name: 'Clock drill',        cat: 'Pressure', trains: 'Short-putt nerve', dist: 3,  brk: 'straight', putts: 8,  glyph: 'pclock',
    how: 'Eight balls in a circle at 3 ft. Start over if you miss.' },
  { id: 'p369',    name: '3-6-9',              cat: 'Pressure', trains: 'Routine',          dist: 6,  brk: 'straight', putts: 9,  glyph: 'pclock',
    how: 'Make 3, 6 and 9 ft in a row, three times.' },
  { id: 'pladder', name: 'Ladder',             cat: 'Speed',    trains: 'Speed',            dist: 20, brk: 'right',    putts: 10, glyph: 'pladder',
    how: 'Putt to 10, 20, 30 and 40 ft. Each ball should finish just past the last.' },
  { id: 'plag',    name: 'Lag to the fringe',  cat: 'Speed',    trains: 'Long-putt speed',  dist: 40, brk: 'straight', putts: 10, glyph: 'plag',
    how: 'Putt from 30 to 50 ft and stop the ball within a putter length of the fringe.' },
  { id: 'pchalk',  name: 'Chalk line',         cat: 'Line',     trains: 'Start line, path', dist: 8,  brk: 'straight', putts: 10, glyph: 'pgate',
    how: 'Snap a chalk line to the cup and start every putt on it.' },
  { id: 'plead',   name: 'Lead hand only',     cat: 'Line',     trains: 'Face control',     dist: 5,  brk: 'straight', putts: 10, glyph: 'pgate',
    how: 'Lead hand only. Keep the face square through the ball.' },
  { id: 'peyes',   name: 'Eyes closed',        cat: 'Speed',    trains: 'Distance feel',    dist: 20, brk: 'straight', putts: 10, glyph: 'pladder',
    how: 'Eyes closed. Call long or short before you look, then log where it stopped.' },
  { id: 'pworld',  name: 'Around the world',   cat: 'Reading',  trains: 'Reading break',    dist: 6,  brk: 'right',    putts: 8,  glyph: 'pworld',
    how: 'Same 6 ft, four sides of the hole. Change the break setting as you move.' },
  { id: 'par18',   name: 'Par 18',             cat: 'Pressure', trains: 'Random practice',  dist: 15, brk: 'left',     putts: 18, glyph: 'pclock',
    how: 'Nine random holes on the putting green, par 2 each. Change distance every hole.' },
];

// Lie adjustments. Right-handed wording; the engine mirrors aim for lefties.
// yds = change to the plays-like distance (positive = needs more club).
export const SURFACES = {
  fairway:   { name: 'Fairway',     yds: 0 },
  light:     { name: 'Light rough', yds: -5, watch: 'Light rough can fly hot and run. Land it short.', setup: 'Normal setup; strike it solid.' },
  deep:      { name: 'Deep rough',  yds: 15, watch: 'Deep rough grabs the hosel. If in doubt, wedge out.', setup: 'Ball back, steeper swing, firm grip.', exclude: ['wood', 'hybrid'], maxCarry: 160 },
  bunker:    { name: 'Bunker',      yds: 10, watch: 'Clear the lip first. One less club if it is high.', setup: 'Dig in, choke down, ball first.', choke: true, exclude: ['D', '3W'] },
  divot:     { name: 'Divot',       yds: 10, watch: 'Expect lower flight and more spin.', setup: 'Ball back, hit down, ball first.' },
};

export const SLOPES = {
  flat:  { name: 'Flat' },
  up:    { name: 'Uphill',     yds: [10, 18], aim: 'right', flight: 'Flies higher and shorter.', setup: 'Shoulders with the slope, ball forward.' },
  down:  { name: 'Downhill',   yds: [-8, -15], aim: 'left', flight: 'Flies lower and longer.', setup: 'Shoulders with the slope, ball back.' },
  above: { name: 'Above feet', yds: [0, 0], choke: true, aim: 'right', flight: 'Tends to draw.', setup: 'Choke down, weight toward the toes, flatter swing.' },
  below: { name: 'Below feet', yds: [5, 10], aim: 'left', flight: 'Tends to fade.', setup: 'Wider stance, more knee flex, stay down.' },
};

// Carry change in yards per 10°F away from 70°F, by club kind (TrackMan, Andrew Rice studies).
export const TEMP_YDS_PER_10F = { wood: 2.0, hybrid: 1.8, iron: 1.6, wedge: 1.3 };
// Carry gain per 1,000 ft of elevation, as a fraction. Published figures range from about 1% to 2%.
export const ELEVATION_PCT_PER_1000FT = 0.015;

export const DIFFICULTY = {
  easy:   'Attack the pins you like.',
  medium: 'Aim at the middle of the green when the pin is tucked.',
  hard:   'Aim at the fat side of greens and club up on anything short.',
};

export const RELIABILITY = {
  sessionsRequired: 3,
  minShotsPerSession: 3,
  weights: { contact: 0.5, direction: 0.3, distance: 0.2 },
  recencyDecay: 0.85,   // each older session counts 85% as much as the next newer one
  spread: 1.2,          // how strongly a club's score moves away from your average
};
