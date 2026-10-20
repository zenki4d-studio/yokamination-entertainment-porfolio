"""Extract still frames from a trailer for a Journal post and write responsive WebP variants.

Run: python scripts/build_journal_frames.py   (needs ffmpeg on PATH or FFMPEG=/path/to/ffmpeg)
Writes assets/projects/<slug>/ and assets/journal-artwork.js (window.JOURNAL_ARTWORK).
"""
from pathlib import Path
import io, json, os, subprocess
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
FFMPEG = os.environ.get('FFMPEG', 'ffmpeg')
POSTS = {
    'lac-hong': {
        'film': 'assets/films/8cf0fc7e40ce.mp4',
        'crop': '1920:824:0:128',  # the trailer is letterboxed to 2.33:1
        'frames': {  # key: seconds — frames without burnt-in subtitles
            'lh-city': 4.5, 'lh-drum-falls': 16.5, 'lh-fire': 19.5, 'lh-drum-held': 22.5,
            'lh-dome': 25.5, 'lh-van-lang': 40.5, 'lh-awakening': 43.5, 'lh-drum-strike': 49.5,
            'lh-lac-bird': 52.5, 'lh-title': 55.5,
        },
    },
}


def grab(film, crop, t):
    png = subprocess.run([FFMPEG, '-hide_banner', '-loglevel', 'error', '-ss', str(t), '-i', str(ROOT / film),
                          '-frames:v', '1', '-vf', f'crop={crop}', '-f', 'image2pipe', '-vcodec', 'png', '-'],
                         check=True, capture_output=True).stdout
    return Image.open(io.BytesIO(png)).convert('RGB')


def encode(image, dest, key):
    variants = []
    for width in (640, 1280, 1920):
        copy = image.copy(); copy.thumbnail((width, width), Image.Resampling.LANCZOS)
        if any(v['width'] == copy.width for v in variants):
            continue
        path = dest / f'{key}-{copy.width}.webp'
        copy.save(path, 'WEBP', quality=84, method=6)
        variants.append(dict(src=path.relative_to(ROOT).as_posix(), width=copy.width, height=copy.height))
    return {'variants': variants}


if __name__ == '__main__':
    out = {}
    for slug, post in POSTS.items():
        dest = ROOT / 'assets/projects' / slug
        dest.mkdir(parents=True, exist_ok=True)
        for key, t in post['frames'].items():
            out[key] = encode(grab(post['film'], post['crop'], t), dest, key)
    (ROOT / 'assets/journal-artwork.js').write_text(
        'window.JOURNAL_ARTWORK = ' + json.dumps(out, indent=2) + ';\n', encoding='utf-8')
    print(f'{len(out)} journal frames written.')
