# Yokamination — AI Film & Visual Studio

Minimal studio website founded and led by Viet Nguyen. The catalogue retains 19 films. Currently only The AI Koreichi and Montage AI Flow are shown; 3D Product, 3D FOOH and Commercial are temporarily hidden from the home selector, collection, filters, counts and project routes. No media is deleted by this setting.

## Restore hidden work

Edit `hiddenWorkGroups` near the top of `studio.js`. Remove a group name to restore that category, or replace the set with `new Set()` to show every category again. The retained group names are `3D FOOH`, `3D PRODUCT` and `TVC Commercial`. This is display filtering, not access control: existing media URLs remain accessible if someone already has them.

## Preview

Run `python -m http.server 3000 --bind 127.0.0.1` in this folder, then open http://localhost:3000.

## Update the film library

Before publishing, run `node scripts/check_site.mjs` and `node --check studio.js`. The checks verify retained media and poster paths, team assets and the temporary visibility setting without modifying the catalogue.

Add MP4 files inside the category folders in `videos/`, then run:

```sh
python -m pip install imageio-ffmpeg
python scripts/build_catalog.py
```

The script creates `assets/catalog.js` and caches real frames in `assets/posters/`. It only indexes files currently present on disk. The curated projects and their summaries are in `studio.js`. Do not manually rename a featured video without updating its lookup there.

Koreichi has a separate web encode at `assets/films/the-ai-koreichi.mp4` (1080p, original 60 fps, H.264/AAC, fast-start). The original 116 MB master remains local and is ignored by Git. `WEB_MEDIA` in the catalogue builder keeps the same film ID/title when indexing the portable encode, including on a fresh checkout without the source master. Other original videos are untouched.

The page order is full-screen film selector, unified Work collection, founder/studio, and contact. The redundant full-width selected-project section has been removed. Active files: `index.html`, `studio.css`, `studio.js`, `assets/catalog.js`. The older `portfolio.css` and `portfolio.js` are no longer loaded.

The home selector currently highlights the two AI films. Its other three saved highlights (Xiaomi 90 Points Suitcase, Ngọc Rồng Đông Giang and Samsung S25 Ultra) return automatically when their groups are restored. The two-film layout uses two columns without empty slots.

## Studio team

The Studio section uses three consistent portrait cards: Viet Nguyen (Founder · AI Filmmaker · Creative Director), Thiện Phước (Art Director · 3D Generalist), and Anh Tuấn (AI Film · Visual Production). Desktop uses three columns, tablet two, and mobile one. Portraits share framing, typography, grayscale-to-color hover, descriptive alt text and the actual silver Y emblem from the brand asset, replacing the old plain `Y.`. Thiện Phước's supplied photograph is unchanged; its displayed crop is CSS only. Anh Tuấn's image is an AI-assisted edit of his supplied photo, facing forward against white; the source and prompt are recorded in `output/imagegen/anh-tuan-portrait-prompt.md`.

The brand intro appears on fresh home-page loads: silver Y symbol → Yokai → i slides to the right while m and nation reveal together from left to right → the complete silver Yokamination lockup → an upward reveal of the website (about 5.55 seconds). The two reveal masks share the same 2.6-second delay and 1.1-second duration. It displays `assets/yokamination-silver-transparent.png` (2172×724, real PNG alpha), extracted from the supplied silver-3D reference using the built-in image tool. The header and footer use the same asset, with no invert/blending trick or rectangular background. SVG windows handle animation and framing; a small alpha-edge filter smooths the displayed contour without changing the metallic colors. Image-edit prompts are recorded in `output/imagegen/silver-logo-prompts.md`. Skip intro and Escape dismiss it; there is no replay control. Deep project/section links and reduced-motion users bypass automatic playback. The background is inert during the intro, focus is restored on exit, and a timer guarantees dismissal if animation events fail. Changing to reduced-motion during the intro dismisses it immediately. The legacy `#more-work` anchor redirects to `#work`.

There is no envelope intro. The cinematic design uses full-bleed film imagery, a fixed navigation with the integrated Y lockup and a restrained acid-green accent. Decorative hero slogans and the oversized hero wordmark have been removed; a visually hidden H1 retains the page identity for assistive technology. The reference is Antiantiart's image-led presentation; no branding or media from that website is used. Contact is centered around Let’s talk and a single-line email. Facebook, Instagram, TikTok and X sit at the bottom in the footer. Facebook is the only currently configured social destination; the other three are explicitly disabled until confirmed profile URLs are supplied.

Design tokens live in `studio.css`: ink `#111211`, paper `#eceee7`, accent `#d6f06b`, responsive `--gutter`, and `--ease`. Featured film buttons have pressed states; collection filters and pagination expose selected states. Keyboard focus uses a visible accent outline. Motion consists of the opening wordmark reveal, film-image transitions and section reveals. Reduced-motion disables animations and automatic previews. Mobile uses a single-column work collection; desktop uses two columns and six films per page.

Only the hovered or keyboard-focused project preview loads a video; leaving it unloads that source. The poster stays visible until an actual decoded frame is presented, and playback errors restore the poster. Koreichi and Montage previews start at 2 seconds to skip their black opening leaders; the full film in the dialog still starts at zero. Home uses separate high-resolution posters in `assets/hero-posters/`, generated with `python scripts/build_catalog.py --hero-only`. Xiaomi and Samsung are portrait films, so the hero contains their complete frame instead of excessively cropping and magnifying it. Clicking opens a project-detail dialog with a native video player. Playback in the detail view is user-initiated. Reduced-motion preferences disable automatic previews.

## Adding a case study later

Project links support direct URLs: `#project/the-ai-koreichi` and `#project/montage-ai-flow`.

1. Replace the relevant `summary` in the `projects` array in `studio.js` with approved project context.
2. The shared `.process-grid` in `index.html` is a scaffold, explicitly marked "CASE STUDY IN DEVELOPMENT". Its three sections cover idea/direction, making the film, and breakdown/credits.
3. Add approved storyboard images, work-in-progress frames and shot breakdowns to `assets/`. When the two studies need different content, render their sections from per-project data alongside `summary` rather than changing the shared copy for both.
4. Only publish confirmed tools, credits and project roles. Remove the development label once the actual case study is complete.

The website is static and needs no Node build. Deploy the HTML, CSS, JavaScript, assets and video directories together on a host that supports byte-range video requests. Google Fonts is the only external display dependency; sans-serif fallbacks are provided.
