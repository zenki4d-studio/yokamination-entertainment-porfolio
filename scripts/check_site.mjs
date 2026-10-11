// Dependency-free checks for the static website. Run: node scripts/check_site.mjs
import assert from 'node:assert/strict';
import {readFileSync, existsSync, statSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = path => readFileSync(resolve(root, path), 'utf8');
const html = read('index.html');
const script = read('studio.js');
const context = {window: {}};
vm.runInNewContext(read('assets/catalog.js'), context);
const films = context.window.FILMS;
assert.ok(films.length > 0, 'Catalogue must not be empty');
assert.equal(new Set(films.map(f => f.id)).size, films.length, 'Film IDs must be unique');

const dependencies = new Set(['index.html', 'studio.css', 'studio.js', 'assets/catalog.js']);
for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
  const path = match[1].split(/[?#]/)[0];
  if (path && !/^(?:[a-z]+:|\/\/)/i.test(path)) dependencies.add(path);
}
for (const film of films) {
  dependencies.add(film.src);
  dependencies.add(film.poster);
}
const featured = [
  'The Ai Koreichi.mp4', 'Montage AI Flow.mp4', '1. Xiaomi 90 Points Suitcase-.mp4',
  '1. Ngọc Rồng Đông Giang_1.mp4', '11-samsung-s25-ultra.mp4',
];
for (const name of featured) {
  const film = films.find(f => f.filename === name);
  assert.ok(film, `Retained highlight missing: ${name}`);
  dependencies.add(`assets/hero-posters/${film.id}.jpg`);
}
for (const path of dependencies) {
  assert.ok(existsSync(resolve(root, path)), `Missing site dependency: ${path}`);
  assert.ok(statSync(resolve(root, path)).size > 0, `Empty site dependency: ${path}`);
}

const hiddenDefinition = script.match(/const hiddenWorkGroups=(new Set\([^;]*\));/);
assert.ok(hiddenDefinition, 'Visibility setting must remain available');
const hidden = vm.runInNewContext(hiddenDefinition[1]);
const visible = films.filter(f => !hidden.has(f.group));
assert.ok(visible.length > 0, 'Visibility settings must leave at least one film');
assert.equal((html.match(/class="team-member(?:\s|"|--)/g) || []).length, 3);
for (const name of ['Viet Nguyen', 'Thiện Phước', 'Anh Tuấn']) assert.ok(html.includes(`<strong>${name}</strong>`));
assert.equal((html.match(/href="#portrait-silver-y"/g) || []).length, 3);
assert.ok(html.includes('id="portrait-silver-y"'));
assert.ok(statSync(resolve(root, 'assets/films/the-ai-koreichi.mp4')).size < 100 * 1024 * 1024,
  'Portable Koreichi encode must stay under the GitHub file-size limit');
console.log(`PASS: ${dependencies.size} assets present, ${films.length} retained films, ${visible.length} visible films, 3 team portraits and silver emblems.`);
