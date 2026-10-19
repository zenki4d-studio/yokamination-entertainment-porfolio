"""Build the catalogue, browser-ready MP4 copies and posters from current local masters.

Run ``python scripts/build_catalog.py`` after adding or moving media in videos/.
The original files are never changed. Generated MP4s keep their source frame rate,
fit within 1920 x 1920 without upscaling, and contain H.264 / AAC with faststart.
"""
from pathlib import Path
import argparse
import concurrent.futures
import hashlib
import json
import re
import subprocess
import sys

import imageio_ffmpeg

ROOT = Path(__file__).resolve().parents[1]
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
POSTERS = ROOT / 'assets' / 'posters'
HERO_POSTERS = ROOT / 'assets' / 'hero-posters'
WEB_FILMS = ROOT / 'assets' / 'films'
MANIFEST = WEB_FILMS / 'manifest.json'
PROFILE = 'h264-crf22-fast-1080p-sourcefps-aac160-faststart-v1'
EXTENSIONS = {'.mp4', '.mov', '.m4v', '.webm', '.mkv'}

# Curated display names only; these do not alter or rename the supplied masters.
TITLES = {
    'The Ai Kuroichi.mp4': 'The Ai Kuroichi',
    'Montage AI Flow.mp4': 'Montage AI Flow',
    '261015_Trailer_Cánh chim Lạc Hồng_4K 16_9.mp4': 'Trailer Cánh chim Lạc Hồng',
    '261014 - Troi Mua Cho Moi Bat Ga.mp4': 'Trời mưa cho mối ăn gà',
    '260827 -  Angle valve Ad.mov': 'Angle Valve Ad',
    '260629_Toillet Brush Ad 24fps.mov': 'Toilet Brush Ad',
    '261001 - Design P-Trap Ad.mp4': 'Design P-Trap Ad',
    '260520 Upwork - 1 Curtain Rod no Drilling Video Ad Conzept.mp4': 'Upwork — No-Drill Curtain Rod Ad',
    '7. GrowPlus+ Váng Sữa_1.mp4': 'GrowPlus+ Váng Sữa',
    'TIKTOPSHOP AI.mp4': 'TikTok Shop AI',
}
HERO_FILENAMES = (
    'The Ai Kuroichi.mp4',
    'Montage AI Flow.mp4',
    '261015_Trailer_Cánh chim Lạc Hồng_4K 16_9.mp4',
    '261014 - Troi Mua Cho Moi Bat Ga.mp4',
    '260827 -  Angle valve Ad.mov',
)
# Starts after the very first fade while still representing the opening scene.
POSTER_TIMES = {
    'The Ai Kuroichi.mp4': 3.0,
    'Montage AI Flow.mp4': 3.0,
    '261015_Trailer_Cánh chim Lạc Hồng_4K 16_9.mp4': 3.0,
    '261014 - Troi Mua Cho Moi Bat Ga.mp4': 3.0,
    '260827 -  Angle valve Ad.mov': 4.0,
}


def relative(path):
    return path.relative_to(ROOT).as_posix()


def catalog_paths():
    """Only current video masters define membership; old generated files never do."""
    return sorted((p for p in (ROOT / 'videos').rglob('*')
                   if p.is_file() and p.suffix.lower() in EXTENSIONS), key=relative)


def run(arguments):
    result = subprocess.run([FFMPEG, '-hide_banner', *arguments],
                            capture_output=True, text=True, encoding='utf-8', errors='replace')
    if result.returncode:
        raise RuntimeError(result.stderr[-6000:])
    return result


def probe(path):
    # The bundled imageio runtime supplies ffmpeg, but does not require ffprobe.
    info = subprocess.run([FFMPEG, '-hide_banner', '-i', str(path)], capture_output=True,
                          text=True, encoding='utf-8', errors='replace').stderr
    duration = re.search(r'Duration: (\d+):(\d+):(\d+\.\d+)', info)
    video_line = next((line for line in info.splitlines() if 'Video:' in line), '')
    dimensions = re.search(r'(?<!\d)(\d{2,5})x(\d{2,5})(?!\d)', video_line)
    frame_rate = re.search(r'(\d+(?:\.\d+)?) fps', video_line)
    codec = re.search(r'Video: ([\w]+)', video_line)
    if not (duration and dimensions and frame_rate and codec):
        raise RuntimeError(f'Cannot read video metadata: {path}\n{info}')
    return {
        'durationSeconds': round(sum(float(value) * weight for value, weight in
                                     zip(duration.groups(), (3600, 60, 1))), 3),
        'width': int(dimensions[1]), 'height': int(dimensions[2]),
        'fps': float(frame_rate[1]), 'codec': codec[1],
        'hasAudio': 'Audio:' in info,
        'audioCodec': (re.search(r'Audio: ([\w]+)', info)[1] if 'Audio:' in info else None),
    }


def sha256(path):
    digest = hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()


def save_manifest(manifest):
    """Checkpoint completed work atomically, always from the main thread."""
    temporary = MANIFEST.with_suffix('.partial.json')
    temporary.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    temporary.replace(MANIFEST)


def title_for(path):
    if path.name in TITLES:
        return TITLES[path.name]
    title = re.sub(r'^\d{6}[ _-]*', '', path.stem)
    title = re.sub(r'^\d+[.\-]\s*', '', title).replace('_', ' ')
    return re.sub(r'\s+', ' ', title).strip(' -')


def make_poster(path, destination, seconds, maximum, quality):
    run(['-loglevel', 'error', '-ss', str(seconds), '-i', str(path), '-map', '0:v:0',
         '-frames:v', '1', '-vf',
         f"scale=w='min({maximum},iw)':h='min({maximum},ih)':force_original_aspect_ratio=decrease:force_divisible_by=2,setsar=1",
         '-q:v', str(quality), '-y', str(destination)])


def build(path, previous, hero_only=False):
    source = relative(path)
    key = hashlib.sha1(source.encode('utf-8')).hexdigest()[:12]
    metadata = probe(path)
    source_hash = sha256(path)
    web = WEB_FILMS / f'{key}.mp4'
    poster = POSTERS / f'{key}.jpg'
    hero_poster = HERO_POSTERS / f'{key}.jpg'
    old = previous.get(source, {})
    reusable = (old.get('sourceSha256') == source_hash and old.get('profile') == PROFILE
                and web.is_file() and web.stat().st_size == old.get('webBytes'))
    if not hero_only and not reusable:
        print(f'Encoding {source}', flush=True)
        temporary = WEB_FILMS / f'{key}.partial.mp4'
        maxrate = '8M' if metadata['fps'] > 30 else '6M'
        run(['-loglevel', 'error', '-i', str(path), '-map', '0:v:0', '-map', '0:a:0?',
             '-map_metadata', '-1', '-vf',
             "scale=w='min(1920,iw)':h='min(1920,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2,setsar=1",
             '-c:v', 'libx264', '-preset', 'fast', '-crf', '22', '-maxrate', maxrate,
             '-bufsize', '12M', '-pix_fmt', 'yuv420p', '-threads', '3', '-fps_mode', 'passthrough',
             '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', '-y', str(temporary)])
        temporary.replace(web)
    if hero_only and path.name not in HERO_FILENAMES:
        return None
    poster_seconds = min(POSTER_TIMES.get(path.name, 3.0), metadata['durationSeconds'] * .25)
    if not hero_only and (not reusable or not poster.exists() or old.get('posterSeconds') != poster_seconds):
        make_poster(path, poster, poster_seconds, 720, 3)
    if path.name in HERO_FILENAMES:
        make_poster(path, hero_poster, poster_seconds, 1920, 2)
    if hero_only:
        return None
    web_metadata = probe(web)
    if (web_metadata['codec'] != 'h264' or web_metadata['hasAudio'] != metadata['hasAudio']
            or abs(web_metadata['durationSeconds'] - metadata['durationSeconds']) > .15
            or abs(web_metadata['fps'] - metadata['fps']) > .02):
        raise RuntimeError(f'Web encode validation failed: {web}')
    group = path.relative_to(ROOT / 'videos').parts[0]
    seconds = metadata['durationSeconds']
    film = dict(id=key, src=relative(web), source=source, poster=relative(poster),
                title=title_for(path), filename=path.name, group=group, subject=group,
                duration=f'{int(seconds)//60:02}:{int(seconds)%60:02}',
                durationSeconds=seconds, width=web_metadata['width'], height=web_metadata['height'],
                fps=web_metadata['fps'], orientation=('portrait' if metadata['height'] > metadata['width'] else 'landscape'))
    if path.name in HERO_FILENAMES:
        film.update(heroPoster=relative(hero_poster), heroOrder=HERO_FILENAMES.index(path.name))
    provenance = dict(sourceSha256=source_hash, sourceBytes=path.stat().st_size,
                      sourceMetadata=metadata, web=relative(web), webBytes=web.stat().st_size,
                      webMetadata=web_metadata, profile=PROFILE, posterSeconds=poster_seconds)
    print(f'Ready {key}: {film["title"]} ({web.stat().st_size / 1_000_000:.1f} MB)', flush=True)
    return film, provenance


if __name__ == '__main__':
    # Redirected Windows output may otherwise default to a legacy code page.
    sys.stdout.reconfigure(encoding='utf-8')
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--hero-only', action='store_true', help='Rebuild the featured posters only.')
    parser.add_argument('--workers', type=int, default=2, help='Simultaneous encodes (default: 2).')
    arguments = parser.parse_args()
    for destination in (POSTERS, HERO_POSTERS, WEB_FILMS):
        destination.mkdir(parents=True, exist_ok=True)
    paths = catalog_paths()
    previous = json.loads(MANIFEST.read_text(encoding='utf-8')) if MANIFEST.exists() else {}
    missing = set(HERO_FILENAMES) - {path.name for path in paths}
    if missing:
        raise RuntimeError(f'Missing featured masters: {sorted(missing)}')
    if arguments.hero_only:
        for path in paths:
            if path.name in HERO_FILENAMES:
                build(path, previous, hero_only=True)
        print(f'Built {len(HERO_FILENAMES)} full-screen posters.')
    else:
        completed = {}
        checkpoint = dict(previous)
        failures = []
        with concurrent.futures.ThreadPoolExecutor(max_workers=max(1, arguments.workers)) as pool:
            pending = {pool.submit(build, path, previous): path for path in paths}
            for future in concurrent.futures.as_completed(pending):
                path = pending[future]
                try:
                    result = future.result()
                except Exception as error:
                    failures.append((relative(path), error))
                    continue
                completed[relative(path)] = result
                checkpoint[relative(path)] = result[1]
                save_manifest(checkpoint)
        if failures:
            raise RuntimeError('Catalogue unchanged; successful encodes were checkpointed. ' +
                               '; '.join(f'{source}: {error}' for source, error in failures)) from failures[0][1]
        # Completion order can vary, but generated catalogue order remains deterministic.
        films = [completed[relative(path)][0] for path in paths]
        manifest = {relative(path): completed[relative(path)][1] for path in paths}
        temporary_catalog = ROOT / 'assets' / 'catalog.partial.js'
        temporary_catalog.write_text('window.FILMS = ' +
            json.dumps(films, ensure_ascii=False, indent=2) + ';\n', encoding='utf-8')
        temporary_catalog.replace(ROOT / 'assets' / 'catalog.js')
        save_manifest(manifest)
        print(f'Built {len(films)} films from the current videos/ folder.')
