# Coach Caddy

**Your data, your practice, your results: science-driven game improvement.**

Coach Caddy is a golf practice and on-course companion. It runs as a home-screen web app: no app store, no accounts, no server. Everything you log stays on your phone.

Version 0.8.

## What's in it

- **Today's session (v0.8).** The Practice tab opens on a four-step plan for about 45 minutes: Warm-up, Baseline, Drills, Re-test. The next step is marked **Start here**, every step except the drills can be skipped, and the plan starts fresh each day. Below it: Just hit balls, Pick drills yourself, Putting and What helps you.
- **Baseline.** 10 free swings that are only counted, then 5 tracked pitching wedges (full swing), 5 tracked 7-irons and 5 tracked drivers, each logged on the ball-and-grass target. The result shows four skills (contact, start line, wedge distance, driver fairways) against your last baseline and picks two drills from what it saw, such as the line drill after two or more fat wedges and 7-irons. Play 9 closes every plan. A drill that has moved your skill before is picked first, and now and then the second drill for a skill gets a turn so each gets a fair trial.
- **Two-button drill tracking.** Each drill asks one question per ball, such as "Which did the club hit first?" with **Ball first** and **Turf first**. A line above the buttons says what this ball is for (the ladder yardage, clock length, grip, shape or Play 9 hole). At the end, one tap rates how it felt: Good, Okay or Poor, or Skip.
- **Drill and skill scores.** Drill score = 70% the count + 30% the feel (Good 100, Okay 60, Poor 20). 75 and up is Solid, 50 to 74 Building, under 50 Not yet. When the feel and the count disagree the drill card says so. Skill scores blend recent drill scores, each older session counting 15% less, and show as a trend line.
- **Re-test.** After the drills, 5 balls with the club that shows the skill best, against this morning's baseline. A quick same-day read.
- **What helps you.** Drills ranked by how much their skill moved from one baseline to the next. A drill is ranked after 3 sessions; until then it shows Early read.
- **Pre-round warm-up.** Five illustrated mobility moves, 45 seconds each: Twist, Reverse Flys, Body Waves, Deep Squat Calf Raises and Standing Thoracic Rotations. Tap **Warm up first** on the home screen (or Warm-up in Practice) to open the cards. Each card shows a start and a movement picture, three cues, a coach tip and its own timer with pause and resume. Swipe or tap the arrow to move between cards. Turn on **Auto-advance** and each finished move rolls into the next card, which starts itself after a 3-second get-ready; the setting is remembered. A soft bell rings when each move ends (twice after the last one); switch it off on the card or in Settings. The screen stays awake while the timer runs where the phone allows it.
- **Range practice.** Start a **Basic range session** (no drill, no ball count, any club) or pick from 18 drills. Drills use the two buttons above. With **Detailed drill tracking** on in Settings, each drill logs the outcome that matters for it instead:
  - **Full-swing drills** use the ball-and-grass target: one way to log, by touch. Tap the ball for contact and the grass for length and direction. Every part is optional; tap **Next shot** to save. The bottom row is the chunk zone, hold the ball for topped or shank, drag records curve, and carry yards are optional. The target adapts to the club and shot type: irons show a pin, woods show a fairway (the bottom of the ball reads skied), and pitches and chips show a green with a labelled ball. Each tracker keeps at most one small optional row under the picture (drill check, contact, start line, flight or lipped out). VoiceOver and Switch Control users get the same outcomes as buttons.
  - **Drill check.** Drills with a key move (line, gate, feet together, pause and others) add one optional Yes/No question, such as "Divot started after the line?". The recap scores it.
  - **Distance drills** (wedge ladder, clock wedges, choke-down gapping, one yardage with 3 clubs) show a top-down range around the target. Tap where the ball landed and fine-tune with − and +. Within 5 yards counts as on the number. Choke-down gapping offers to update My bag with the carries you measured.
  - **Shape drills** (9-shot drill and punch shot) show a 3 × 3 grid of heights and curves. The planned shot is outlined in gold; tap the box the ball actually flew.
  - **Impact spray** shows the club face, drawn to match the club: an iron, a fairway wood or hybrid, or a dark driver face, mirrored for left-handers. Tap where the powder mark is; after a few balls it names your strike pattern.
  - **Play 9 on the range** plays a 9-hole card with par 3s, 4s and 5s (18 balls). The caddy picks a club for each shot, and the recap counts fairways and greens.
- **Drill details.** Every range and putting drill has an info button. It opens a sheet with the setup, numbered steps, purpose, feel, **If done correctly** (what success looks like plus a target, such as 12 of 15 divots after the line) and a YouTube link, with **Add to session** at the bottom. Tapping the card itself selects the drill. While logging, the info button next to the drill name opens the same sheet. Recaps show whether each drill's target was met.
- **Changing clubs.** A one-row club rail sits above every logger: tap a club to switch, swipe for more. The drill's club has a gold dot and your most reliable clubs are starred. Touch and hold the rail, or tap the swing button, for the full bag and swing types. A basic session shows ball counts on each club and a "By club" breakdown in the recap.
- **Putting practice.** 10 drills and a top-down hole logger. Tap the cup for a make or where the ball stopped, or pick distance (short or long) and direction. Lipped out is a switch. Tap **Next shot** to save. Breaking putts read as high side or low side.
- **Play a round.** Tap **Caddy: Play** to start a round:
  - **Pick a course** from your saved courses, or search by state and name. Course data comes from [OpenGolfAPI](https://opengolfapi.org) (OpenStreetMap community data), the same source as Mulligan Skins. The preview shows pars, handicaps and yardages per hole; pick tees and All 18, Front 9 or Back 9. Courses not in the database can be added as a custom course (par 4 everywhere until changed on the hole screen). Once added, a course is stored on the phone, so the round works offline.
  - **One screen per hole, in playing order:** Ask caddy, tee shot, penalties, putts, then the score (blank until you set it, with Birdie, Par, Bogey, Double shortcuts), a strip of all holes to go back and fix one, and **Finish the hole**. The last hole reads **Finish the round**.
  - **Ask caddy** opens the caddy with the hole's yardage filled in. **Use this club** saves the call (yardage, lie, club, aim) to the hole, and tapping the saved call records how it went.
  - **Round outline** at the end: score against par, front and back nines, a plain-language takeaway, the scorecard, fairways, greens, putts, penalties, and every caddy call grouped by lie. Save the suggested drills as your next practice plan. Past rounds are listed on the Caddy: Play screen.
  - **Just the caddy** is the first row on the Play screen: conditions and caddy with no scorecard.
- **Plain-language recaps.** Each recap names your miss pattern and its likely cause, shows a golf-science diagram, and suggests your next drills.
- **Caddy.** Set temperature, ground, elevation and difficulty once. The yardage runs to 300. Two swipeable tabs follow:
  - **Cheat sheet:** carries adjusted for today's conditions.
  - **Lie:** surface and slope adjustments.

  A shot card picks the club and gives aim, setup and what to watch for.
- **Club reliability.** Each club gets a 0 to 100 score built from contact (50%), direction (30%) and distance (20%), with recent sessions weighted more. The score is measured against your own average, so 50 is a typical club for you.
  - A club unlocks after 3 practice sessions with it.
  - Your top three are starred, and the caddy prefers them when two clubs can reach.
- **My bag.** Tap a club to edit its full and choked carries, its loft, and whether it is in the bag. Tap **Edit** to take clubs out (they stay listed, crossed out, and the caddy stops suggesting them) or delete custom clubs. Add up to 5 custom clubs with a name, type, carry and optional loft.
- **Settings** (the gear on Home): appearance, practice (the warm-up bell and detailed drill tracking), which hand you swing with, your data and about. **Your data** shows how much is stored on the phone:
  - **Export data (CSV)** saves everything at that moment, including a session in progress, as one CSV file. Each row is one record (range shot, putt, round hole, caddy call, club or setting, plus older course holes and shots), named in the first column, so it filters cleanly in Excel or Google Sheets. On iPhone the share sheet opens (Save to Files, Mail, AirDrop); elsewhere the file downloads.
  - **Reset** asks "If you reset, all your data will be deleted. Are you sure?" Yes deletes every session, the bag, the plan and all settings, and the app starts fresh. Cancel, tapping outside or Escape changes nothing, and **Export a copy first** saves the CSV without leaving the prompt.
  - **Backup (JSON)** saves an exact copy of everything for a future restore.
- **Appearance.** Automatic follows the phone's light and dark setting; Day or Night overrides it in Settings.
- **Built for iPhone conventions (v0.7).** A tab bar (Home, Practice, Play, My bag), standard back buttons that name the previous screen, Close and Finish on full-screen tasks, switches, sheets with Done, and a 44-point minimum for every control. Text uses the system font on Apple devices (Inter elsewhere) and follows the phone's text size, from a 12-point floor.
- **One screen per view.** Every screen fits the phone it's on, from 320 px wide up. Main actions sit in a pinned bar at the bottom, long lists scroll above it, and the targets scale to the space left.
- **Offline.** It works offline once loaded, fonts included.

## Put it on GitHub Pages

1. Create a new repository, for example `coach-caddy`.
2. Upload everything in this folder to the repository root, including the hidden `.nojekyll` file.
3. In the repository, open **Settings → Pages**. Set **Source** to "Deploy from a branch", choose `main` and `/ (root)`, and save.
4. After a minute the site is live at `https://<your-user>.github.io/coach-caddy/`.
5. On iPhone, open that address in Safari and tap **Share → Add to Home Screen**.

All paths are relative, so it works from any repository name.

## Updating

When you change files, also bump `VERSION` in `sw.js` (for example `cc-v0.1.1`). Phones then fetch the new version on the next launch instead of using the cached copy.

## Trying it with data

Open **My bag** (or Settings) and tap **Try sample data** to load a few weeks of practice history. You can then see reliability scores, starred clubs and recaps right away. **Reset all data** in Settings clears everything.

## Files

| File | What it does |
| --- | --- |
| `index.html` | App shell |
| `css/fonts.css`, `fonts/` | Bundled Inter and Space Grotesk (SIL Open Font License), so the app looks the same offline |
| `css/styles.css` | Day and night themes, layout, target colors, and the v0.7 type, spacing and touch system |
| `tools/rem.py` | Run after editing `styles.css`: converts text sizes to rem so they follow the phone's text size |
| `js/data.js` | Clubs, shot types, drills and the tracker each drill uses, lie rules, condition constants (tune here) |
| `js/engine.js` | Recaps, reliability scoring, caddy recommendations |
| `js/practice.js` | v0.8 practice logic: the per-drill question, rating words, drill and skill scores, the baseline, drill picks and drill impact (no screen code, so a Watch app could reuse it) |
| `js/targets.js` | The ball-and-grass, fairway, green, carry, club-face and putting targets |
| `js/app.js` | Screens and navigation |
| `js/store.js` | Local storage on the phone |
| `js/sample.js` | Sample history |
| `js/courses.js` | Course search and scorecard loading from OpenGolfAPI, custom courses |
| `js/export.js` | The CSV export: columns, wording and record types |
| `js/details.js` | Drill details: steps, purpose, feel, If done correctly and each drill's target (edit the wording here) |
| `js/warmup.js` | Warm-up moves, cues and their illustrations (edit moves or timings here) |
| `sw.js`, `manifest.webmanifest`, `icons/` | Offline support and home-screen install |

## Notes on the numbers

- **Temperature.** Carry changes about 1.3 to 2 yards per 10°F, more with driver, based on TrackMan figures and Andrew Rice's tests.
- **Elevation.** Carry gains 1.5% per 1,000 ft. Published figures range from about 1% to 2%; tune `ELEVATION_PCT_PER_1000FT` in `data.js`.
- **Lie adjustments.** These are coaching consensus, consistent across major instruction sources, and the app labels them that way.
- **Drill scores and picks.** The 70/30 split, the bands and the baseline rules that pick drills are starting points. Tune them in `SCORE` and `RULES` in `practice.js`.
- **Reliability.** Comes from baselines, re-tests and Just hit balls sessions (and older detailed drill sessions), since two-button drills don't record contact or direction. The thresholds are starting points. Adjust them in the `RELIABILITY` block of `data.js`.

## Next up

- **Putting baseline:** 5 putts at 3 ft, 3 at 10 ft and 2 lags from 30 ft.
- **Apple Watch logging:** a watchOS companion to the native app, with the two drill buttons on the wrist. It needs the native wrapper first, since a web app can't run on the Watch.
