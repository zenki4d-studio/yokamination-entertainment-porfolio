"""Rebuild the local film catalogue and real video posters: python scripts/build_catalog.py."""
from pathlib import Path
import argparse, concurrent.futures, hashlib, json, re, subprocess
import imageio_ffmpeg
ROOT = Path(__file__).resolve().parents[1]
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
POSTERS = ROOT / 'assets' / 'posters'
POSTERS.mkdir(parents=True, exist_ok=True)
HERO_FILENAMES = {
    'The Ai Koreichi.mp4', 'Montage AI Flow.mp4',
    '1. Xiaomi 90 Points Suitcase-.mp4', '1. Ngọc Rồng Đông Giang_1.mp4',
    '11-samsung-s25-ultra.mp4',
}
# Web encodes preserve catalogue identities while source masters stay local.
WEB_MEDIA = {'videos/AI PRODUCTION/The Ai Koreichi.mp4': 'assets/films/the-ai-koreichi.mp4'}

def canonical_path(path):
    relative = path.relative_to(ROOT).as_posix()
    return next((source for source, web in WEB_MEDIA.items() if web == relative), relative)

def catalog_paths():
    paths = {p.relative_to(ROOT).as_posix(): p for p in (ROOT / 'videos').rglob('*.mp4')}
    for source, web in WEB_MEDIA.items():
        if (ROOT / web).exists():
            paths[source] = ROOT / web
    return sorted(paths.values(), key=canonical_path)
def build_hero_posters():
    """Only rebuild the five full-screen stills; leave the catalogue and grid posters untouched."""
    destination = ROOT / 'assets' / 'hero-posters'
    destination.mkdir(parents=True, exist_ok=True)
    paths = [path for path in catalog_paths() if Path(canonical_path(path)).name in HERO_FILENAMES]
    if len(paths) != len(HERO_FILENAMES):
        raise RuntimeError('Expected exactly five featured films; check HERO_FILENAMES before rebuilding.')
    for path in paths:
        key = hashlib.sha1(canonical_path(path).encode()).hexdigest()[:12]
        poster = destination / (key + '.jpg')
        subprocess.run([
            FFMPEG, '-hide_banner', '-loglevel', 'error', '-ss', '2', '-i', str(path),
            '-frames:v', '1', '-vf',
            "scale=w='min(1920,iw)':h='min(1920,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2",
            '-q:v', '2', '-y', str(poster)
        ], check=True, capture_output=True)
    print(f'Built {len(paths)} high-resolution hero posters (maximum 1920px, no upscaling).')
def build(path):
    relative = canonical_path(path)
    key = hashlib.sha1(relative.encode()).hexdigest()[:12]
    poster = POSTERS / (key + '.jpg')
    info = subprocess.run([FFMPEG, '-hide_banner', '-i', str(path)], capture_output=True, text=True, encoding='utf-8', errors='replace').stderr
    match = re.search(r'Duration: (\d+):(\d+):(\d+\.\d+)', info)
    seconds = sum(float(v)*m for v,m in zip(match.groups(), [3600,60,1])) if match else 0
    if not poster.exists():
        subprocess.run([FFMPEG, '-hide_banner', '-loglevel', 'error', '-ss', str(min(2.0, seconds*.18)), '-i', str(path), '-frames:v', '1', '-vf', 'scale=720:-2', '-q:v', '4', '-y', str(poster)], check=True, capture_output=True)
    parts = Path(relative).relative_to('videos').parts
    group = parts[0]
    subject = parts[1] if group == 'AI PRODUCTION' and len(parts) > 2 else group
    raw = Path(relative).stem
    title = re.sub(r'^\d+[.\-]\s*', '', raw).replace('_1','').rstrip('- ')
    if raw.startswith('Video_'):
        title = f'{subject} — Study {raw.split("_")[-1]}'
    else:
        title = title.replace('-', ' ')
    return dict(id=key, src=path.relative_to(ROOT).as_posix(), poster=f'assets/posters/{key}.jpg', title=title, filename=Path(relative).name, group=group, subject=subject, duration=f'{int(seconds)//60:02}:{int(seconds)%60:02}')
if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--hero-only', action='store_true', help='Rebuild only the five full-screen featured posters.')
    if parser.parse_args().hero_only:
        build_hero_posters()
        raise SystemExit(0)
    paths = catalog_paths()
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        films = list(pool.map(build, paths))
    (ROOT / 'assets' / 'catalog.js').write_text('window.FILMS = ' + json.dumps(films, ensure_ascii=False, indent=2) + ';\n', encoding='utf-8')
    print(f'Built {len(films)} films and posters.')
