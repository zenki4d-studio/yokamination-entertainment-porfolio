(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const films = (window.FILMS || []).slice().sort((a, b) => (a.heroOrder ?? 99) - (b.heroOrder ?? 99));
  const nice = g => ({ 'AI GAME CINEMATIC': 'Game Cinematic', 'MONTAGE AI CATALOG': 'Montage AI', 'AI CARTOON': 'Animation', 'AI 3D PRODUCT': '3D Product', 'AI SOCIAL': 'Social' })[g] || g;
  const year = f => '20' + ((f.filename || '').match(/^(\d{2})\d{4}/)?.[1] || '26');
  let soundOn = false;
  // All in-page playback uses the 720p copies (assets/films/720) — lighter and smoother than 1080p/4K.
  const src720 = f => f.src.replace('assets/films/', 'assets/films/720/');
  const projects = {
    '86f05f7694b5': { slug: 'the-ai-kuroichi', summary: 'An AI game cinematic from Yokamination — a burning city, a lone warrior and a story told entirely with AI-generated imagery.' },
    '672d7733e84d': { slug: 'montage-ai-flow', summary: 'A selection of Yokamination AI imagery, brought together in one showreel.' },
    '8cf0fc7e40ce': { slug: 'canh-chim-lac-hong', summary: 'An AI animated trailer inspired by Vietnamese history and legend.' },
    'f5aa30040bec': { slug: 'troi-mua-cho-moi-an-ga', summary: 'A fantasy adventure based on Vietnamese upside-down folk rhymes.' },
    'f17dc282b414': { slug: 'angle-valve-ad', summary: 'A product advertising film featuring an angle valve, built with AI 3D production.' }
  };

  // Display names: no "Upwork —" prefix and no studio name inside project titles.
  const clean = t => t.replace(/^Upwork\s*[—–-]\s*/i, '').replace(/\s*\bYokamination\b\s*/gi, ' ').trim();
  // These three are one-minute trailers of longer films.
  const trailers = new Set(['86f05f7694b5', '8cf0fc7e40ce', 'f5aa30040bec']);
  films.forEach(f => f.title = clean(f.title) + (trailers.has(f.id) ? ' Trailer' : ''));

  /* ---------- Endless reel ---------- */
  // Slides are positioned with GPU transforms instead of native scroll: sub-pixel smooth drift,
  // no layout jank, and an index k that runs forever in both directions (film = k mod n).
  const reel = $('#reel');
  const byId = Object.fromEntries(films.map(f => [f.id, f]));
  const n = films.length, mod = k => ((k % n) + n) % n;
  const slides = new Map(); // k -> element
  let h = innerHeight, y = 0, target = 0, userUntil = 0, lastFrame = 0, dragMoved = false;
  const SPEED = 26; // px per second of constant drift
  const isHome = () => document.body.dataset.view === 'home' && !document.hidden;

  const makeSlide = k => {
    const f = films[mod(k)], el = document.createElement('article');
    el.className = 'slide';
    el.innerHTML = `<img src="${f.heroPoster || f.poster}" alt="" decoding="async">
      <video muted loop playsinline preload="auto" poster="${f.heroPoster || f.poster}" src="${src720(f)}"></video>
      <div class="meta"><span class="t">${f.title}</span><span class="cv">${nice(f.group)}<br>${f.duration}</span></div>`;
    const v = $('video', el);
    // Two films open on a black leader; the reel starts them a few seconds in.
    const skip = { 'The Ai Kuroichi.mp4': 3, 'Montage AI Flow.mp4': 3 }[f.filename];
    if (skip) v.addEventListener('loadedmetadata', () => { v.currentTime = skip; }, { once: true });
    v.addEventListener('playing', () => el.classList.add('playing'));
    el.addEventListener('click', () => { if (!dragMoved) location.hash = 'project/' + f.id; });
    reel.appendChild(el);
    return el;
  };
  const dropSlide = (k, el) => { const v = $('video', el); v.pause(); v.removeAttribute('src'); v.load(); el.remove(); slides.delete(k); };

  const layout = () => {
    const first = Math.floor(y / h);
    // keep one slide behind and two ahead mounted, so the next film is already running before it enters
    for (let k = first - 1; k <= first + 2; k++) if (!slides.has(k)) slides.set(k, makeSlide(k));
    slides.forEach((el, k) => {
      if (k < first - 1 || k > first + 2) return dropSlide(k, el);
      el.style.transform = `translate3d(0,${(k * h - y).toFixed(2)}px,0)`;
      const v = $('video', el), shouldPlay = isHome() && k >= first && k <= first + 2;
      v.muted = !(soundOn && k === Math.round(y / h)); // sound only on the film in focus
      if (shouldPlay && v.paused) v.play().catch(() => {});
      else if (!shouldPlay && !v.paused) v.pause();
    });
  };
  const playReel = on => { if (!on) slides.forEach(el => $('video', el).pause()); layout(); };

  const frame = now => {
    const dt = Math.min(.05, (now - (lastFrame || now)) / 1000); lastFrame = now;
    if (isHome()) {
      if (now > userUntil) target += SPEED * dt;
      y += (target - y) * (1 - Math.exp(-dt * 9));
      layout();
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);

  // Manual control: wheel, touch drag with momentum, keyboard. Drift resumes 2.5s after the last input.
  const hold = () => userUntil = performance.now() + 2500;
  reel.addEventListener('wheel', e => { e.preventDefault(); hold(); target += e.deltaY * (e.deltaMode === 1 ? 40 : 1); }, { passive: false });
  let ty = null, tTarget = 0, lastY = 0, lastT = 0, vel = 0;
  reel.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse') return; ty = lastY = e.clientY; tTarget = target; lastT = performance.now(); vel = 0; dragMoved = false; hold(); });
  addEventListener('pointermove', e => {
    if (ty == null) return;
    const now = performance.now(); vel = (lastY - e.clientY) / Math.max(1, now - lastT); lastY = e.clientY; lastT = now;
    if (Math.abs(e.clientY - ty) > 6) dragMoved = true;
    target = tTarget + (ty - e.clientY); hold();
  });
  addEventListener('pointerup', () => { if (ty == null) return; target += vel * 320; ty = null; hold(); setTimeout(() => dragMoved = false, 50); });
  addEventListener('keydown', e => {
    if (document.body.dataset.view !== 'home') return;
    const d = { ArrowDown: 1, PageDown: 1, ' ': 1, ArrowUp: -1, PageUp: -1 }[e.key];
    if (d) { e.preventDefault(); hold(); target = (Math.round(target / h) + d) * h; }
  });
  addEventListener('resize', () => { const r = y / h; h = innerHeight; y = target = r * h; layout(); });
  layout();

  // "Watch" cursor over anything that opens a film.
  const cur = document.createElement('div'); cur.className = 'watch-cursor'; cur.textContent = 'Watch'; document.body.appendChild(cur);
  addEventListener('pointermove', e => {
    const on = e.pointerType === 'mouse' && e.target.closest('.slide, .card');
    cur.classList.toggle('on', !!on);
    cur.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
  }, { passive: true });

  /* ---------- Work grid ---------- */
  const grid = $('#grid');
  films.forEach((f, i) => {
    const c = document.createElement('article');
    c.className = 'card'; c.dataset.group = f.group;
    c.innerHTML = `<div class="media"><img src="${f.poster}" alt="" loading="lazy"><video muted loop playsinline preload="none"></video></div>
      <div class="info"><span class="n">N°${String(i + 1).padStart(2, '0')}</span><span>${f.title}<br><span class="yr">${f.duration}</span></span><span>${nice(f.group)}</span></div>`;
    const v = $('video', c);
    c.addEventListener('mouseenter', () => { if (!v.src) v.src = src720(f); v.play().catch(() => {}); });
    c.addEventListener('mouseleave', () => v.pause());
    c.addEventListener('click', () => location.hash = 'project/' + f.id);
    grid.appendChild(c);
  });
  const groups = [...new Set(films.map(f => f.group))];
  const fl = $('#filters');
  const setFilter = g => {
    fl.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.g === g));
    grid.querySelectorAll('.card').forEach(c => c.classList.toggle('hide', g !== 'all' && c.dataset.group !== g));
  };
  fl.innerHTML = `<li><button data-g="all">All<sup>${films.length}</sup></button></li>` +
    groups.map(g => `<li><button data-g="${g}">${nice(g)}</button></li>`).join('');
  // Picking a category is what opens the Work grid; the Work tab itself only opens the menu.
  fl.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; setFilter(b.dataset.g); setMenu(false); location.hash = 'work'; });
  const workTab = $('[data-nav=work]');
  const setMenu = open => {
    if (open) document.body.style.setProperty('--wx', workTab.getBoundingClientRect().left + 'px');
    document.body.classList.toggle('menu-open', open); workTab.setAttribute('aria-expanded', open);
  };
  workTab.addEventListener('click', e => { e.preventDefault(); e.stopImmediatePropagation(); setMenu(!document.body.classList.contains('menu-open')); });
  // A click outside the open menu only closes it (it doesn't also open the film underneath).
  addEventListener('click', e => {
    if (!document.body.classList.contains('menu-open') || e.target.closest('.menu-panel, [data-nav=work]')) return;
    e.preventDefault(); e.stopPropagation(); setMenu(false);
  }, true);
  addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });
  setFilter('all');

  /* ---------- Team ---------- */
  const team = [
    ['Viet Nguyen', 'Founder · Creative Director', 'assets/team/viet.png'],
    ['Thien Phuoc', 'Art Director · 3D Generalist', 'assets/team/phuoc.png'],
    ['Anh Tuan', 'AI Film · Visual Production', 'assets/team/tuan.png']
  ];
  const teamEl = $('#team'), names = $('#team-names'), roles = $('#team-roles'), img = $('#team-img');
  names.innerHTML = team.map(t => `<li>${t[0]}</li>`).join('');
  roles.innerHTML = team.map(t => `<li>${t[1]}</li>`).join('');
  team.forEach(t => { new Image().src = t[2]; }); // preload all portraits
  let ti = 0;
  const wrap = i => (i + team.length) % team.length;
  const showTeam = (i, dir = 0) => {
    ti = wrap(i);
    // Position every name/role relative to the current one so the lists glide like a wheel.
    [names, roles].forEach(l => [...l.children].forEach((li, k) => {
      let o = k - ti; if (o > team.length / 2) o -= team.length; if (o < -team.length / 2) o += team.length;
      li.style.setProperty('--o', o); li.style.opacity = o === 0 ? 1 : Math.abs(o) === 1 ? .2 : 0; li.classList.toggle('cur', o === 0);
    }));
    teamEl.classList.remove('swap-up', 'swap-down');
    if (dir) teamEl.classList.add(dir > 0 ? 'swap-down' : 'swap-up');
    img.classList.add('out');
    const want = ti;
    setTimeout(() => {
      if (want !== ti) return; // a newer step already took over
      img.src = team[ti][2]; img.alt = team[ti][0];
      // Reveal only once the new portrait is decoded, so the old face never shows under the new name.
      img.decode().catch(() => {}).then(() => { if (want === ti) img.classList.remove('out'); });
      teamEl.classList.remove('swap-up', 'swap-down');
    }, dir ? 420 : 0);
  };
  [names, roles].forEach(l => l.addEventListener('click', e => { const li = e.target.closest('li'); if (li) { const k = [...l.children].indexOf(li); if (k !== ti) showTeam(k, k > ti ? 1 : -1); } }));
  let wheelLock = 0, touchY = null;
  const step = d => { if (Date.now() - wheelLock < 900) return; wheelLock = Date.now(); showTeam(ti + d, d); };
  teamEl.addEventListener('wheel', e => { if (Math.abs(e.deltaY) > 8) step(e.deltaY > 0 ? 1 : -1); }, { passive: true });
  teamEl.addEventListener('touchstart', e => touchY = e.touches[0].clientY, { passive: true });
  teamEl.addEventListener('touchend', e => { if (touchY == null) return; const d = touchY - e.changedTouches[0].clientY; if (Math.abs(d) > 40) step(d > 0 ? 1 : -1); touchY = null; });
  addEventListener('keydown', e => { if (document.body.dataset.view === 'team' && /Arrow(Up|Down)/.test(e.key)) step(e.key === 'ArrowDown' ? 1 : -1); });
  showTeam(0);
  const teamBg = $('.team-bg'); teamBg.dataset.src = src720(byId['f5aa30040bec'] || films[0]);

  /* ---------- Background videos for About / Contact ---------- */
  const bgFilms = films.filter(f => f.orientation === 'landscape');
  document.querySelectorAll('[data-bg]').forEach((v, i) => v.dataset.src = src720(bgFilms[(i * 3 + 1) % bgFilms.length]));

  /* ---------- Routing ---------- */
  let lastView = 'work';
  const route = () => {
    const view = (location.hash.slice(1) || 'home');
    const pid = view.startsWith('project/') && byId[view.slice(8)] ? view.slice(8) : null;
    const v = pid ? 'project' : ['work', 'team', 'about'].includes(view) ? view : view === 'contact' ? 'about' : 'home';
    if (pid) openProject(byId[pid]); else { closeProject(); lastView = v; }
    document.body.dataset.view = v; document.body.classList.remove('menu-open');
    document.querySelectorAll('[data-nav]').forEach(a => a.classList.toggle('on', a.dataset.nav === v || (v === 'project' && a.dataset.nav === 'work')));
    document.querySelectorAll('[data-bg], .team-bg').forEach(b => {
      if (b.closest('.view').id === v) { if (!b.src) b.src = b.dataset.src; b.play().catch(() => {}); } else b.pause();
    });
    playReel(v === 'home');
  };
  // Clicking the active nav item again returns home, like the reference site.
  document.querySelectorAll('[data-nav]:not([data-nav=work])').forEach(a => a.addEventListener('click', e => {
    if (location.hash === '#' + a.dataset.nav) { e.preventDefault(); history.pushState(null, '', location.pathname); route(); }
  }));
  addEventListener('hashchange', route);

  /* ---------- Project detail ---------- */
  const proj = $('#project'), pv = $('#p-video'), pnext = $('#p-next');
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const art = key => window.PROJECT_ARTWORK?.[key]?.variants || [];
  // One image tile. `sec` puts a section heading on the image itself instead of a text block above it.
  const tile = (it, { full = false, sec = '', sub = '' } = {}) => {
    const v = art(it.image); if (!v.length) return '';
    const big = v.at(-1), mid = v.find(x => x.width >= 1280) || big;
    return `<figure class="tile${full ? ' full' : ''}"><img src="${mid.src}" srcset="${v.map(x => `${x.src} ${x.width}w`).join(', ')}"
      sizes="${full ? '100vw' : '(max-width:760px) 100vw, 50vw'}" alt="${esc(it.alt || it.title || '')}" loading="lazy" decoding="async">
      ${sec ? `<span class="sec">${esc(sec)}${sub ? `<small>${esc(sub)}</small>` : ''}</span>` : ''}
      ${it.title ? `<figcaption>${esc(it.title.replace(/^\d+ \/ /, ''))}</figcaption>` : ''}</figure>`;
  };
  // A group of tiles: odd counts end with one full-width image so the grid never leaves a hole.
  const group = (items, sec, sub) => items.map((it, i) => tile(it, {
    full: items.length === 1 || (items.length % 2 === 1 && i === items.length - 1), sec: i === 0 ? sec : '', sub: i === 0 ? sub : ''
  })).join('');
  const shortSec = t => ({ 'Character development': 'Expressions', 'Storyboard and animation': 'Storyboard', 'Prop design': 'Props' })[t] || t;

  function renderStory(story) {
    const behind = story.behind.sections.filter(x => x.images?.length);
    const used = new Set([story.leadArtwork, ...story.world.images, ...story.characters, ...behind.flatMap(x => x.images)].map(x => x.image));
    const stills = Object.keys(window.PROJECT_ARTWORK || {}).filter(k => !used.has(k)).map(k => ({ image: k }));
    return tile(story.leadArtwork, { full: true }) +
      group(story.world.images, story.world.title) +
      group(story.characters, 'Characters') +
      (stills.length ? group(stills, 'Stills') : '') +
      behind.map((x, i) => group(x.images, shortSec(x.title), i === 0 ? story.behind.title : '')).join('');
  }
  const teamName = n => ({ 'Nguyen Hoang Viet': 'Viet Nguyen', 'Le Thien Phuoc': 'Thien Phuoc', 'Tran Anh Tuan': 'Anh Tuan' })[n] || n;
  const credits = (f, story) => {
    const block = (title, rows) => {
      const half = Math.ceil(rows.length / 2), cols = [rows.slice(0, half), rows.slice(half)];
      // left column fills first, right column second — like a film's end roll
      const cells = []; for (let i = 0; i < half; i++) cols.forEach(c => cells.push(c[i] ? `<dt>${esc(c[i][0])}</dt><dd>${esc(c[i][1])}</dd>` : '<dt></dt><dd></dd>'));
      return `<section class="cred"><h3>${esc(title)}</h3><dl>${cells.join('')}</dl></section>`;
    };
    const out = [];
    if (story) {
      out.push(block('Production house | Yokamination Entertainment', story.credits.map(([r, n]) => [r, teamName(n)])));
      out.push(block('Original music', [['Music Producer', 'Viet Nguyen']]));
      out.push(block('Made with', story.tools.split('·').map(t => t.trim()).map((t, i) => [i ? '' : 'Tools', t])));
    } else out.push(block('Production house | Yokamination Entertainment', [['Director', 'Viet Nguyen'], ['Production', 'Yokamination Entertainment']]));
    return out.join('');
  };

  function openProject(f) {
    const info = projects[f.id] || {}, story = window.PROJECT_STORIES?.[info.slug];
    if (pv.dataset.id !== f.id) {
      pv.dataset.id = f.id; pv.src = src720(f); pv.poster = f.heroPoster || f.poster;
      pv.muted = true; pv.controls = false; proj.scrollTop = 0;
      $('#p-title').textContent = f.title;
      const facts = [['Category', nice(f.group)], ['Year', year(f)], ['Duration', f.duration]];
      if (story) story.facts.filter(([k]) => k !== 'Production').forEach(r => facts.push(r));
      $('#p-facts').innerHTML = facts.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('');
      $('#p-sum').textContent = story ? story.summary : (info.summary || '');
      $('#p-gallery').innerHTML = story ? renderStory(story) : '';
      $('#p-credits').innerHTML = credits(f, story);
      const i = films.indexOf(f), prev = films[(i - 1 + films.length) % films.length], next = films[(i + 1) % films.length];
      pnext.innerHTML = `<a href="#project/${prev.id}">← ${esc(prev.title)}</a><a href="#project/${next.id}">${esc(next.title)} →</a>`;
    }
    pv.play().catch(() => {});
  }
  function closeProject() { if (!pv.paused) pv.pause(); }
  $('#p-play').addEventListener('click', () => { pv.muted = false; pv.controls = true; pv.currentTime = 0; pv.play().catch(() => {}); });
  $('.p-back').addEventListener('click', e => { e.preventDefault(); location.hash = lastView === 'home' ? '' : lastView; });
  proj.addEventListener('scroll', () => { if (proj.scrollTop > innerHeight * .8) pv.pause(); else if (pv.paused && pv.muted && document.body.dataset.view === 'project') pv.play().catch(() => {}); }, { passive: true });

  /* ---------- Sound + clock ---------- */
  $('#sound').addEventListener('click', e => {
    soundOn = !soundOn; e.currentTarget.setAttribute('aria-pressed', soundOn); e.currentTarget.textContent = soundOn ? 'Sound on' : 'Sound off';
    layout();
  });
  const clock = $('#clock');
  const tick = () => clock.textContent = new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', hour12: false }) + ' ICT';
  tick(); setInterval(tick, 1000);
  route();
})();
