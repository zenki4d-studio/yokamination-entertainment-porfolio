// Dependency-free checks for the static website. Run: node scripts/check_site.mjs
import assert from 'node:assert/strict';
import {readFileSync, existsSync, statSync, readdirSync} from 'node:fs';
import {resolve, dirname, relative, extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = path => readFileSync(resolve(root, path), 'utf8');
const html = read('index.html');
const studioHtml = read('studio.html');
const context = {window: {}};
vm.runInNewContext(read('assets/catalog.js'), context);
vm.runInNewContext(read('assets/project-stories.js'), context);
vm.runInNewContext(read('assets/project-artwork.js'), context);
const films = context.window.FILMS;
assert.ok(films.length > 0, 'Catalogue must not be empty');
assert.equal(new Set(films.map(f => f.id)).size, films.length, 'Film IDs must be unique');
const walk = folder => readdirSync(folder, {withFileTypes:true}).flatMap(entry => {
  const path = resolve(folder, entry.name);
  return entry.isDirectory() ? walk(path) : [path];
});
const checkSources = process.argv.includes('--sources');
if (checkSources) {
  const groups = new Set(films.map(f => f.group));
  const masters = walk(resolve(root, 'videos')).filter(path => /\.(mp4|mov|m4v|webm|mkv)$/i.test(path))
    .map(path => relative(root, path).replaceAll('\\', '/'))
    .filter(path => groups.has(path.split('/')[1])).sort();
  assert.deepEqual(Array.from(films, f => f.source).sort(), masters,
    'Catalogue must include every supplied current master exactly once');
}

const dependencies = new Set(['index.html', 'studio.html', 'studio.css', 'studio.js', 'studio-page.css', 'studio-page.js', 'assets/catalog.js']);
for (const image of Object.values(context.window.PROJECT_ARTWORK)) {
  assert.equal(new Set(image.variants.map(v => v.width)).size, image.variants.length, 'Responsive image widths must be unique');
  for (const variant of image.variants) {
    dependencies.add(variant.src);
    assert.ok(variant.width <= 2048 && variant.height <= 2048, 'Project images must fit within 2K');
  }
}
const checkArtworkReferences = value => {
  if (!value || typeof value !== 'object') return;
  if (value.image) assert.ok(context.window.PROJECT_ARTWORK[value.image], `Missing project artwork: ${value.image}`);
  Object.values(value).forEach(checkArtworkReferences);
};
checkArtworkReferences(context.window.PROJECT_STORIES);
for (const match of (html + studioHtml).matchAll(/(?:src|href)="([^"]+)"/g)) {
  const path = match[1].split(/[?#]/)[0];
  if (path && !/^(?:[a-z]+:|\/\/)/i.test(path)) dependencies.add(path);
}
for (const film of films) {
  dependencies.add(film.src);
  dependencies.add(film.poster);
  if (checkSources) dependencies.add(film.source);
  assert.equal(extname(film.src), '.mp4', `Browser-ready MP4 required: ${film.filename}`);
  assert.ok(film.width > 0 && film.height > 0 && film.durationSeconds > 0,
    `Missing media dimensions or duration: ${film.filename}`);
}
const featured = [
  'The Ai Kuroichi.mp4', 'Montage AI Flow.mp4',
  '261015_Trailer_Cánh chim Lạc Hồng_4K 16_9.mp4',
  '261014 - Troi Mua Cho Moi Bat Ga.mp4', '260827 -  Angle valve Ad.mov',
];
for (const name of featured) {
  const film = films.find(f => f.filename === name);
  assert.ok(film, `Featured film missing: ${name}`);
  dependencies.add(`assets/hero-posters/${film.id}.jpg`);
}
for (const path of dependencies) {
  assert.ok(existsSync(resolve(root, path)), `Missing site dependency: ${path}`);
  assert.ok(statSync(resolve(root, path)).size > 0, `Empty site dependency: ${path}`);
}

const expectedGroups = ['AI GAME CINEMATIC', 'MONTAGE AI CATALOG', 'AI CARTOON', 'AI 3D PRODUCT', 'AI SOCIAL'];
assert.deepEqual([...new Set(films.map(f => f.group))].sort(), expectedGroups.sort());
assert.equal(films.filter(f => f.group === 'AI SOCIAL').length, 2, 'Both social videos must be included');
assert.ok(films.filter(f => f.group === 'AI SOCIAL').every(f => f.height > f.width),
  'Social videos must retain portrait framing');
assert.ok(html.includes('id="hero-toggle"'), 'Featured playback must have an accessible pause control');
assert.ok(!html.includes('Human vision.') && !html.includes('data-team-slide') && !html.includes('id="about"'),
  'Studio and people must be on their own page');
assert.equal((html.match(/href="studio.html"/g) || []).length, 2, 'Both home Studio links must open the separate page');
assert.equal((studioHtml.match(/data-team-slide\s/g) || []).length, 3);
for (const name of ['Viet Nguyen', 'Thien Phuoc', 'Anh Tuan']) assert.ok(studioHtml.includes(`data-name="${name}"`));
assert.ok(studioHtml.includes('Founder, Yokamination') && studioHtml.includes('Co-founder, Zen AI'));
assert.equal((studioHtml.match(/href="#portrait-silver-y"/g) || []).length, 3);
assert.ok(studioHtml.includes('id="portrait-silver-y"'));
assert.ok(studioHtml.includes('data-team-prev') && studioHtml.includes('data-team-next'));
assert.ok(!/src="(?:studio\.js|assets\/catalog\.js)/.test(studioHtml), 'Studio page must not initialize the home film player');
console.log(`PASS: ${dependencies.size} assets across 2 pages, ${films.length} films, ${featured.length} highlights, 2 portrait social films, separate Studio with 3 people and founder affiliations.`);
