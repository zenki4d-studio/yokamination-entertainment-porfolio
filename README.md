# Yokamination — AI Film & Visual Studio

Static studio portfolio. The home page uses `index.html`, `studio.css`, `studio.js`, and `assets/catalog.js`. The separate Studio page uses `studio.html`, shared `studio.css`, `studio-page.css` and `studio-page.js`. No Node build is required.

## Local preview

Run `python scripts/serve.py` in this folder, then open <http://127.0.0.1:3000/?preview=oct18>. This local server supports byte-range video requests for reliable seeking. Hard-refresh with Ctrl+F5 if an older page is cached.

## Current collection

The catalogue indexes the 10 supplied films in these five folders:

- `AI GAME CINEMATIC`: The AI Kuroichi.
- `MONTAGE AI CATALOG`: Montage AI Flow.
- `AI CARTOON`: two animated films.
- `AI 3D PRODUCT`: four product ads, including the Upwork curtain rod project.
- `AI SOCIAL`: two portrait social films.

The Work collection has category filters and six films per page. Cards load a muted preview only on hover or keyboard focus. Portrait videos retain their complete frame. Selecting a project opens a native player for the full film from the beginning; playback there is user initiated. Credits and competition results should only be added when confirmed.

## Featured films

The full-screen opening rotates in this order:

1. The AI Kuroichi.
2. Montage AI Flow.
3. Cánh chim Lạc Hồng.
4. Trời mưa cho mối ăn gà.
5. Angle Valve Ad (`260827 -  Angle valve Ad.mov`).

Each muted preview starts around 3 seconds into its film, plays for 7 seconds, then advances. The progress line follows actual playback, so buffering and pauses do not consume the preview. Select a title to switch immediately, or use Pause previews / Play previews. Rotation does not move keyboard focus.

The opening brand animation finishes before previews begin. Playback pauses while the hero is offscreen, the page is hidden, a card preview is active, or a project dialog is open, and resumes when appropriate. Reduced-motion visitors see a still until explicitly pressing Play previews. Autoplay or loading failures restore a manual Play control.

Featured definitions, display titles and preview duration are near the top of `studio.js`. The previous `#project/the-ai-koreichi` link still opens Kuroichi.

## Update the library

Add or move media inside `videos/`, then run:

```sh
python scripts/build_catalog.py
node scripts/check_site.mjs
node --check studio.js
```

The builder requires `imageio-ffmpeg`. It reads MP4 and MOV sources, preserves the original masters, and generates browser-ready H.264/AAC MP4s with faststart in `assets/films/`. Web copies fit within 1920px without upscaling and keep the original frame rate. `assets/films/manifest.json` records source metadata so unchanged encodes can be reused. Posters use actual video frames; featured posters are generated separately at higher resolution. Use `python scripts/build_catalog.py --hero-only` to refresh only those stills.

The catalogue includes each original source path, its web copy, duration and dimensions. The five current source folders are local-only and ignored by Git; published MP4s and posters live in `assets/`. A fresh checkout can serve the website without source masters. To rebuild, restore the original masters to their catalogue source paths first. Run `node scripts/check_site.mjs --sources` to additionally verify local master coverage. Rebuild after renaming sources, and update any affected featured filename lookup in `studio.js` and the builder. Old assets are retained; the current catalogue only references current films.

Before publishing, browser-check automatic playback and transitions, filters, pagination, full-film playback and mobile layout. Static checks verify media coverage and files but do not prove browser playback. Deploy HTML, CSS, JavaScript and `assets/` together on a host supporting byte-range video requests; the generated web copies are used by the website.

## Studio and branding

The Studio menu and Meet the Studio link open `studio.html`. Human vision and all personnel have moved completely off the home page. The Studio page presents one person at a time: Việt Nguyễn, Thiện Phước and Anh Tuấn. Previous/next buttons and arrow keys switch people manually; there is no automatic rotation. The counter and screen-reader status identify the current person. Profile links (`#person-viet`, `#person-phuoc`, `#person-tuan`) select a person directly. Legacy home `#about` links redirect to the new page.

Việt Nguyễn is identified as Founder of Yokamination and Co-founder of Zen AI, with an introductory biography. Original silver Yokamination artwork is shared by the header, footer, portrait emblems and home opening animation. The home intro can be skipped or dismissed with Escape; deep links and reduced-motion visitors bypass it.

Contact uses `yokamination@gmail.com`. Facebook is configured; Instagram, TikTok and X remain disabled until confirmed profile links are supplied. Google Fonts has a local sans-serif fallback. The older `portfolio.css` and `portfolio.js` are no longer loaded.
