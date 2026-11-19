# gta6-cover-art

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Revieww/gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Revieww/gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Vice Nights — an offline web app that turns your photos and a caption into a multi-panel GTA-style poster cover, in the spirit of GTA 6's key art: three photo panels cut by slanted seams, a Vice City sunset (or neon, or midnight) colour grade, a sun disc with palm silhouettes drawn in code, and bold poster lettering. Export the cover as a PNG in 1080 x 1080, 1080 x 1350 or 1920 x 1080 and share it. All art, lettering and fonts are original — no Rockstar Games logo, artwork or font is used. Your photos are read on your own machine and never leave it.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser. Pick a photo for each of the three panels (or use one photo for all of them), crop and position each panel with the zoom and pan sliders, write your caption, pick a colour grade and a post size, and hit Export PNG.

To hand the entry in, run:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

That copies `app/` and `screenshots/` to `out/` and writes `out/dossier.json`.

---

Entered on [make.fun](https://make.fun/?ref=jcjwypkg&utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for cash rewards
