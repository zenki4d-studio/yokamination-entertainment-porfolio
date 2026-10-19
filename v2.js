(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const films = (window.FILMS || []).slice().sort((a, b) => (a.heroOrder ?? 99) - (b.heroOrder ?? 99));
  const nice = g => g.replace(/^AI /, '').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  const year = f => '20' + ((f.filename || '').match(/^(\d{2})\d{4}/)?.[1] || '26');
  let soundOn = false;

  /* ---------- Endless reel ---------- */
  const reel = $('#reel');
  let count = 0;
  const makeSlide = f => {
    const el = document.createElement('article');
    el.className = 'slide';
    el.dataset.id = f.id;
    el.innerHTML = `<img src="${f.heroPoster || f.poster}" alt="" loading="lazy">
      <div class="meta"><span class="mid p">P:</span><span class="mid t">${f.title}</span><span class="mid y">${year(f)}</span>
      <span class="c">C:<br>C:</span><span class="cv">Yokamination<br>${nice(f.group)}</span></div>`;
    el.addEventListener('click', () => openPlayer(f));
    return el;
  };
  const appendRound = () => { films.forEach(f => reel.appendChild(makeSlide(f))); count += films.length; };
  appendRound(); appendRound();

  // Attach a video only to slides near the viewport; detach far ones to keep memory flat.
  const byId = Object.fromEntries(films.map(f => [f.id, f]));
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      const s = e.target; let v = $('video', s);
      if (e.isIntersecting) {
        if (!v) {
          v = document.createElement('video');
          Object.assign(v, { muted: !soundOn, loop: true, playsInline: true, preload: 'auto', src: byId[s.dataset.id].src });
          v.addEventListener('playing', () => s.classList.add('playing'));
          s.prepend(v);
        }
        if (e.intersectionRatio > .6 && document.body.dataset.view === 'home') { v.muted = !soundOn; v.play().catch(() => {}); }
        else v.pause();
      } else if (v) { v.pause(); v.removeAttribute('src'); v.load(); v.remove(); s.classList.remove('playing'); }
    });
  }, { root: reel, threshold: [0, .6] });
  const observeAll = () => reel.querySelectorAll('.slide:not([data-o])').forEach(s => { s.dataset.o = 1; io.observe(s); });
  observeAll();

  reel.addEventListener('scroll', () => {
    // Keep the loop endless: append another round when near the bottom, trim the top when the DOM grows.
    if (reel.scrollTop + reel.clientHeight * 3 > reel.scrollHeight) { appendRound(); observeAll(); }
    if (count > films.length * 4) {
      const h = reel.clientHeight;
      for (let i = 0; i < films.length; i++) { io.unobserve(reel.firstElementChild); reel.firstElementChild.remove(); }
      count -= films.length; reel.scrollTop -= h * films.length;
    }
  }, { passive: true });

  // Gentle autoplay: advance to the next film every ~9s if the visitor is idle.
  let idle = 0;
  ['wheel', 'touchstart', 'keydown', 'pointermove'].forEach(t => addEventListener(t, () => idle = 0, { passive: true }));
  setInterval(() => {
    if (document.body.dataset.view !== 'home' || $('#player').open) return;
    if (++idle >= 9) { idle = 0; reel.scrollBy({ top: reel.clientHeight, behavior: 'smooth' }); }
  }, 1000);

  /* ---------- Work grid ---------- */
  const grid = $('#grid');
  films.forEach((f, i) => {
    const c = document.createElement('article');
    c.className = 'card'; c.dataset.group = f.group;
    c.innerHTML = `<div class="media"><img src="${f.poster}" alt="" loading="lazy"><video muted loop playsinline preload="none"></video></div>
      <div class="info"><span class="n">N°${String(i + 1).padStart(2, '0')}</span><span>${f.title}<br>Yokamination<br><span class="yr">${year(f)}</span></span><span>${nice(f.group)}</span></div>`;
    const v = $('video', c);
    c.addEventListener('mouseenter', () => { if (!v.src) v.src = f.src; v.play().catch(() => {}); });
    c.addEventListener('mouseleave', () => v.pause());
    c.addEventListener('click', () => openPlayer(f));
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
  fl.addEventListener('click', e => { const b = e.target.closest('button'); if (b) setFilter(b.dataset.g); });
  setFilter('all');

  /* ---------- Team ---------- */
  const team = [
    ['Viet Nguyen', 'Founder · Creative Director', 'assets/viet-nguyen.jpeg'],
    ['Thien Phuoc', 'Art Director · 3D Generalist', 'assets/thien-phuoc-portrait.png'],
    ['Anh Tuan', 'AI Film · Visual Production', 'assets/anh-tuan-portrait.png']
  ];
  const names = $('#team-names'), roles = $('#team-roles'), img = $('#team-img');
  names.innerHTML = team.map(t => `<li>${t[0]}</li>`).join('');
  roles.innerHTML = team.map(t => `<li>${t[1]}</li>`).join('');
  let ti = 0;
  const showTeam = i => {
    ti = (i + team.length) % team.length;
    [names, roles].forEach(l => [...l.children].forEach((li, k) => li.classList.toggle('on', k === ti)));
    img.style.opacity = 0;
    setTimeout(() => { img.src = team[ti][2]; img.alt = team[ti][0]; img.style.opacity = 1; }, 180);
  };
  [names, roles].forEach(l => l.addEventListener('mouseover', e => { const li = e.target.closest('li'); if (li) showTeam([...l.children].indexOf(li)); }));
  let wheelLock = 0;
  $('#team').addEventListener('wheel', e => { if (Date.now() - wheelLock < 600) return; wheelLock = Date.now(); showTeam(ti + (e.deltaY > 0 ? 1 : -1)); }, { passive: true });
  showTeam(0);

  /* ---------- Background videos for About / Contact ---------- */
  const bgFilms = films.filter(f => f.orientation === 'landscape');
  document.querySelectorAll('[data-bg]').forEach((v, i) => v.dataset.src = bgFilms[(i * 3 + 1) % bgFilms.length].src);

  /* ---------- Routing ---------- */
  const route = () => {
    const view = (location.hash.slice(1) || 'home');
    const v = ['work', 'team', 'about', 'contact'].includes(view) ? view : 'home';
    document.body.dataset.view = v;
    document.querySelectorAll('[data-nav]').forEach(a => a.classList.toggle('on', a.dataset.nav === v));
    document.querySelectorAll('[data-bg]').forEach(b => {
      if (b.closest('.view').id === v) { if (!b.src) b.src = b.dataset.src; b.play().catch(() => {}); } else b.pause();
    });
    reel.querySelectorAll('video').forEach(x => x.pause());
    if (v === 'home') { const cur = [...reel.children].find(s => Math.abs(s.getBoundingClientRect().top) < 50); $('video', cur || reel)?.play().catch(() => {}); }
  };
  // Clicking the active nav item again returns home, like the reference site.
  document.querySelectorAll('[data-nav]').forEach(a => a.addEventListener('click', e => {
    if (location.hash === '#' + a.dataset.nav) { e.preventDefault(); history.pushState(null, '', location.pathname); route(); }
  }));
  addEventListener('hashchange', route); route();

  /* ---------- Player ---------- */
  const dlg = $('#player'), pv = $('#pv');
  function openPlayer(f) {
    reel.querySelectorAll('video').forEach(x => x.pause());
    pv.src = f.src; pv.poster = f.poster; $('#pt').textContent = f.title;
    dlg.showModal(); pv.play().catch(() => {});
  }
  $('#close').addEventListener('click', () => dlg.close());
  dlg.addEventListener('close', () => { pv.pause(); pv.removeAttribute('src'); pv.load(); route(); });

  /* ---------- Sound + clock ---------- */
  $('#sound').addEventListener('click', e => {
    soundOn = !soundOn; e.currentTarget.setAttribute('aria-pressed', soundOn); e.currentTarget.textContent = soundOn ? 'Sound on' : 'Sound off';
    document.querySelectorAll('.slide video').forEach(v => v.muted = !soundOn);
  });
  const clock = $('#clock');
  const tick = () => clock.textContent = new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', hour12: false }) + ' ICT';
  tick(); setInterval(tick, 1000);
})();
