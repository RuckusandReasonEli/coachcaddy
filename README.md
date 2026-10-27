# Coach Caddy

**Your data, your practice, your results: science-driven game improvement.**

Coach Caddy is a golf practice and on-course companion. It runs as a home-screen web app: no app store, no accounts, no server. Everything you log stays on your phone.

Version 0.1, first working iteration.

## What's in it

- **Range practice.** Pick from 18 drills, then log every ball on a ball-and-grass target. Tap the ball for contact, tap the grass for where it finished. The bottom row is the chunk zone. Double-tap the ball for an on-target shot, drag to record curve, and optionally add carry yards.
  - The target adapts to the club and shot type: irons show a pin, woods show a fairway with a tee, and pitches and chips show a green with rings.
- **Putting practice.** 10 drills and a top-down hole logger. Tap the cup for a make, or tap where the ball stopped. Breaking putts read as high side or low side.
- **Course practice.** Log a round hole by hole. The recap shows where strokes leaked and builds your next practice plan.
- **Plain-language recaps.** Each recap names your miss pattern and its likely cause, shows a golf-science diagram, and suggests your next drills.
- **Caddy.** Set temperature, moisture, elevation and difficulty once. Two swipeable tabs follow:
  - **Cheat sheet:** carries adjusted for today's conditions.
  - **Lie:** surface and slope adjustments.

  A shot card picks the club and gives aim, setup and what to watch for.
- **Club reliability.** Each club gets a 0 to 100 score built from contact (50%), direction (30%) and distance (20%), with recent sessions weighted more. The score is measured against your own average, so 50 is a typical club for you.
  - A club unlocks after 3 practice sessions with it.
  - Your top three are starred, and the caddy prefers them when two clubs can reach.
- **Day and night themes.** Switch with the sun/moon button.
- **Offline.** It works offline once loaded.

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

Open **My bag** and tap **Try sample data** to load a few weeks of practice history. You can then see reliability scores, starred clubs and recaps right away. **Reset all** clears everything.

## Files

| File | What it does |
| --- | --- |
| `index.html` | App shell and fonts |
| `css/styles.css` | Day and night themes, layout, target colors |
| `js/data.js` | Clubs, shot types, drills, lie rules, condition constants (tune here) |
| `js/engine.js` | Recaps, reliability scoring, caddy recommendations |
| `js/targets.js` | The ball-and-grass, fairway, green and putting targets |
| `js/app.js` | Screens and navigation |
| `js/store.js` | Local storage on the phone |
| `js/sample.js` | Sample history |
| `sw.js`, `manifest.webmanifest`, `icons/` | Offline support and home-screen install |

## Notes on the numbers

- **Temperature.** Carry changes about 1.3 to 2 yards per 10°F, more with driver, based on TrackMan figures and Andrew Rice's tests.
- **Elevation.** Carry gains 1.5% per 1,000 ft. Published figures range from about 1% to 2%; tune `ELEVATION_PCT_PER_1000FT` in `data.js`.
- **Lie adjustments.** These are coaching consensus, consistent across major instruction sources, and the app labels them that way.
- **Reliability.** The thresholds are starting points. Adjust them in the `RELIABILITY` block of `data.js`.
