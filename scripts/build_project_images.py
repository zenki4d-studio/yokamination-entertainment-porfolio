"""Create responsive WebP derivatives; original project artwork remains untouched.

Run python scripts/build_project_images.py. Pass --deck PATH to additionally
extract the sketch/keyframe pair from the supplied portfolio presentation.
"""
from pathlib import Path
import argparse, hashlib, io, json, zipfile
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / 'assets/projects/troi-mua'
SOURCES = {
    'rooftop-lullaby': 'hf_20261014_165643_03492012-92d2-4e94-96b6-a41cb1bcb28d_min.png',
    'location-village': 'hf_20261010_163412_8324765e-cda2-49bf-9da6-c951d7dc0c59.png',
    'location-lane': 'Painted_in_the_exact_art_...lines_no_modern_buildings5.png',
    'location-terraces': 'Painted_in_the_exact_art_...lines_no_modern_buildings 1.png',
    'location-ocean': 'Painted_in_the_exact_art_...al_no_ocean_floor_no_text.png',
    'teo': '29071d9a-af4b-48bf-8ec3-692ac7890e33.png',
    'mo': 'hf_20261010_162248_5cafa17e-fca6-4419-b0c4-bfab0167cda5.png',
    'heo': 'hf_20261010_162820_32b5f71d-3a9a-4750-9245-639a9a5c72b9.png',
    'grandmother': 'hf_20261013_181046_257244db-23ec-4ef8-8080-43478bd8b491_min.png',
    'buffalo': 'hf_20261013_184035_fdbba699-e328-4027-b62a-d733d8c57f34.png',
    'ducks': 'hf_20261013_184112_e896a89a-5db0-4939-9a34-49926904e050_min.png',
    'termite': 'hf_20261014_035318_8831fdc7-fdc9-4fdd-846e-50e4ba6c02d9.png',
    'faces': 'hf_20261012_032233_58838b00-af62-44be-816f-a334e65f8cd1_min (1).png',
    'crystal': 'hf_20261012_034305_6bad57a5-5064-4793-92c1-f714555f2a4b_min.png',
    'fishing-rod': 'Prop_design_sheet_painted...nds_no_background_scenery.png',
    'location-rooftop': 'Painted_in_the_exact_art_...lines_no_modern_buildings.png',
    'location-valley': 'Painted_in_the_exact_art_...lines_no_modern_buildings3.png',
    'rooster-faces': 'hf_20261012_040434_f72b101f-d0a0-45ca-b995-325d2e9f65d4_min.png',
    'frame-aerial': '7cffba3c-06bc-4980-83e6-3e72955a4a02.png',
    'frame-flight': 'hf_20261012_040927_2d2ac188-d5ae-4c71-b690-6589d7ea2b85_min.png',
    'frame-terraces': 'hf_20261012_061510_1ff3d81b-d170-4899-97da-c28d56e5b356_min.png',
    'frame-dive': 'hf_20261012_081115_0c9ee7d1-cb29-4644-ba8d-716b7031440f_min.png',
    'frame-koi': 'hf_20261012_084810_26af6908-a2ed-49e3-b0e7-221414ccc828_min.png',
    'frame-crystal': 'hf_20261012_085132_ce5d882e-7f59-4b6c-b352-fbe8b1ebbc6f_min.png',
    'frame-hilltop': 'hf_20261012_155053_3f11c43d-9365-4034-85d9-d59fd3a05a6a_min.png',
    'frame-landing': 'hf_20261012_172441_28d2dd5f-189a-4cef-835c-73621b8b7aa6_min.png',
    'frame-buffalo': 'hf_20261014_051754_49c7e1c3-64c3-46b6-ae51-e35f01dd09c7_min.png',
    'frame-ducks': 'hf_20261014_074649_3b21bddb-c6dc-4f42-8f53-1a12d1a52d84_min.png',
}
DECK_IMAGES = {'sketch': 'ppt/media/image39.png', 'keyframe': 'ppt/media/image40.png'}


def write_browser_manifest(manifest):
    public = {key: {'variants': item['variants']} for key, item in manifest.items()}
    (ROOT / 'assets/project-artwork.js').write_text(
        'window.PROJECT_ARTWORK = ' + json.dumps(public, ensure_ascii=False, indent=2) + ';\n', encoding='utf-8')


def encode(key, contents, source):
    with Image.open(io.BytesIO(contents)) as original:
        image = ImageOps.exif_transpose(original).convert('RGB')
        variants = []
        for width in (640, 1280, 2048):
            copy = image.copy()
            copy.thumbnail((width, width), Image.Resampling.LANCZOS)
            if any(v['width'] == copy.width for v in variants):
                continue
            path = DEST / f'{key}-{copy.width}.webp'
            copy.save(path, 'WEBP', quality=84, method=6)
            variants.append(dict(src=path.relative_to(ROOT).as_posix(), width=copy.width,
                                 height=copy.height, bytes=path.stat().st_size))
        return dict(source=source, sourceBytes=len(contents), sourceSha256=hashlib.sha256(contents).hexdigest(),
                    sourceWidth=image.width, sourceHeight=image.height, variants=variants)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--deck', type=Path)
    args = parser.parse_args()
    DEST.mkdir(parents=True, exist_ok=True)
    manifest_path = DEST / 'manifest.json'
    manifest = json.loads(manifest_path.read_text(encoding='utf-8')) if manifest_path.exists() else {}
    manifest = {key: value for key, value in manifest.items() if key in SOURCES or key in DECK_IMAGES}
    for key, filename in SOURCES.items():
        source = next((folder / filename for folder in (ROOT / 'pictures/Project Troi Mua Cho Moi Bat Ga', ROOT / 'pictures')
                       if (folder / filename).is_file()), None)
        if source is None:
            raise FileNotFoundError(f'Missing original artwork: {filename}')
        manifest[key] = encode(key, source.read_bytes(), source.relative_to(ROOT).as_posix())
    if args.deck:
        with zipfile.ZipFile(args.deck) as deck:
            for key, member in DECK_IMAGES.items():
                manifest[key] = encode(key, deck.read(member), f'{args.deck.name}:{member}')
    if not all(key in manifest for key in DECK_IMAGES):
        raise RuntimeError('First build requires --deck PATH for the sketch/keyframe artwork.')
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    write_browser_manifest(manifest)
    originals = sum(item['sourceBytes'] for item in manifest.values())
    output = sum(v['bytes'] for item in manifest.values() for v in item['variants'])
    print(f'{len(manifest)} artworks, original sources {originals / 1_000_000:.1f} MB; '
          f'all responsive WebP variants {output / 1_000_000:.2f} MB.')
