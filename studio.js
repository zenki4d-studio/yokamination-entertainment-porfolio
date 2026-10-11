(() => {
  'use strict';
  // Temporarily hide catalog groups across filters, cards, highlights, counts and project routes.
  // To restore a group, remove its catalog name below; use new Set() to restore every group.
  const hiddenWorkGroups=new Set(['3D FOOH','3D PRODUCT','TVC Commercial']);
  const films=(window.FILMS||[]).filter(f=>!hiddenWorkGroups.has(f.group));
  // Replace these summaries with approved case-study copy when production material is available.
  const projects=[
    {slug:'the-ai-koreichi',title:'The AI Koreichi',type:'AI FILM',film:films.find(f=>f.filename==='The Ai Koreichi.mp4'),summary:'A featured AI film in the Yokamination collection. Watch the film above; the story behind its development will be added as the case study takes shape.'},
    {slug:'montage-ai-flow',title:'Montage AI Flow',type:'AI SHOWREEL',film:films.find(f=>f.group==='Montage'),summary:'The Yokamination AI showreel. A selection of moving images presented as one film. Production notes and individual shot breakdowns will be added here.'}
  ].filter(p=>p.film);
  const groupLabels={'3D PRODUCT':'3D Product','3D FOOH':'3D FOOH','TVC Commercial':'Commercial','AI PRODUCTION':'AI Film','Montage':'Showreel'};
  const displayTitles={'11-samsung-s25-ultra.mp4':'Samsung S25 Ultra'};
  const supporting=films.filter(f=>!projects.some(p=>p.film.id===f.id)).map(f=>({slug:`film-${f.id}`,title:displayTitles[f.filename]||f.title,type:groupLabels[f.group]||f.group,film:f}));
  const allProjects=[...projects,...supporting];
  // Home highlights reuse the library entries; they do not change the AI Work filter.
  const heroFilenames=['1. Xiaomi 90 Points Suitcase-.mp4','1. Ngọc Rồng Đông Giang_1.mp4','11-samsung-s25-ultra.mp4'];
  const heroProjects=[...projects,...heroFilenames.map(filename=>supporting.find(p=>p.film.filename===filename)).filter(Boolean)];
  heroProjects.forEach(p=>{p.heroPoster=`assets/hero-posters/${p.film.id}.jpg`});
  // These two films begin with black leaders. Full project playback still starts at zero.
  const previewStarts={'The Ai Koreichi.mp4':2,'Montage AI Flow.mp4':2};
  const $=s=>document.querySelector(s),url=s=>s.split('/').map(encodeURIComponent).join('/');
  const dialog=$('#project-dialog'),video=$('#project-video');let active=null,returnFocus=null;
  $('#film-total').textContent=films.length;
  function stop(){
    const previous=active;if(!previous)return;active=null;
    previous.cleanup?.();previous.link.classList.remove('previewing');
    previous.video.pause();previous.video.removeAttribute('src');previous.video.load();
  }
  function preview(link,v,p){
    stop();if(matchMedia('(prefers-reduced-motion: reduce)').matches||dialog.open||!$('#brand-intro').hidden)return;
    const session={link,video:v};active=session;
    let frameRequest=null,started=false,startAt=previewStarts[p.film.filename]||0;
    const isCurrent=()=>active===session;
    const fail=()=>{if(isCurrent())stop()};
    // Keep the still visible until a decoded frame is actually presented, not just play() resolving.
    const ready=()=>isCurrent()&&!v.paused&&!v.seeking&&v.readyState>=2&&v.currentTime>=startAt;
    const reveal=()=>{if(ready()){link.classList.add('previewing');clearTimeout(watchdog)}};
    const nextFrame=()=>{
      if(!isCurrent()||frameRequest!==null||!v.requestVideoFrameCallback)return;
      frameRequest=v.requestVideoFrameCallback((_,frame)=>{
        frameRequest=null;if(!isCurrent())return;
        if(ready()&&frame.mediaTime>=startAt-.05)reveal();else nextFrame();
      });
    };
    const playing=()=>{if(v.requestVideoFrameCallback)nextFrame()};
    const timeUpdate=()=>{if(!v.requestVideoFrameCallback&&v.currentTime>startAt+.05)reveal()};
    const waiting=()=>{if(isCurrent())link.classList.remove('previewing')};
    const play=()=>{if(!isCurrent()||started)return;started=true;v.play().catch(fail)};
    const metadata=()=>{
      if(!isCurrent())return;
      startAt=Math.min(startAt,Math.max(0,v.duration-.25));
      if(startAt>0){try{v.currentTime=startAt}catch{fail()}}else play();
    };
    const seeked=()=>{if(isCurrent())play()};
    const events={loadedmetadata:metadata,seeked,playing,timeupdate:timeUpdate,waiting,error:fail};
    Object.entries(events).forEach(([name,handler])=>v.addEventListener(name,handler));
    const watchdog=setTimeout(fail,12000);
    session.cleanup=()=>{
      clearTimeout(watchdog);
      if(frameRequest!==null&&v.cancelVideoFrameCallback)v.cancelVideoFrameCallback(frameRequest);
      Object.entries(events).forEach(([name,handler])=>v.removeEventListener(name,handler));
    };
    v.poster=url(p.film.poster);v.src=url(p.film.src);v.load();
  }
  function open(p){stop();if(!dialog.open)returnFocus=document.activeElement;$('#project-title').textContent=p.title;$('#project-type').textContent=p.type;$('#project-summary').textContent=p.summary||'';['.project-overview','.process-heading','.process-grid'].forEach(s=>$(s).hidden=!p.summary);video.src=url(p.film.src);video.poster=url(p.film.poster);$('#original').href=url(p.film.src);$('#video-error').hidden=true;if(!dialog.open)dialog.showModal();dialog.scrollTop=0;$('#project-title').focus({preventScroll:true})}
  function route(){const p=allProjects.find(p=>location.hash===`#project/${p.slug}`);if(p)open(p);else if(dialog.open)dialog.close()}
  window.addEventListener('scroll',()=>{if(active){const r=active.link.getBoundingClientRect();if(r.bottom<=0||r.top>=innerHeight)stop()}},{passive:true});
  function projectCard(p){const a=document.createElement('a');a.className='project';a.href=`#project/${p.slug}`;a.setAttribute('aria-label',`View project: ${p.title}`);const media=document.createElement('div');media.className='project-media';const img=new Image();img.src=url(p.film.poster);img.alt=`Still from ${p.title}`;img.loading='lazy';const v=document.createElement('video');v.muted=true;v.loop=true;v.playsInline=true;v.preload='none';v.setAttribute('aria-hidden','true');media.append(img,v);const info=document.createElement('div');info.className='project-info';const copy=document.createElement('div');const title=document.createElement('h3');title.textContent=p.title;const type=document.createElement('p');type.textContent=p.type+' / VIEW PROJECT';copy.append(title,type);const arrow=document.createElement('span');arrow.textContent='↗';info.append(copy,arrow);a.append(media,info);a.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch')preview(a,v,p)});a.addEventListener('pointerleave',stop);a.addEventListener('focus',()=>preview(a,v,p));a.addEventListener('blur',stop);return a}
  let workFilter='All work',workPage=1;
  const workPageSize=6;
  function renderWork(){
    stop();
    const matches=allProjects.filter(p=>workFilter==='All work'||(workFilter==='AI Work'?projects.includes(p):p.type===workFilter));
    const pages=Math.max(1,Math.ceil(matches.length/workPageSize));
    workPage=Math.min(workPage,pages);
    $('#more-grid').replaceChildren(...matches.slice((workPage-1)*workPageSize,workPage*workPageSize).map(projectCard));
    $('#work-count').textContent=`${matches.length} films · Page ${workPage} of ${pages}`;
    $('#work-filters').replaceChildren();
    ['All work','AI Work',...new Set(supporting.map(p=>p.type))].forEach(label=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.setAttribute('aria-pressed',String(label===workFilter));b.onclick=()=>{workFilter=label;workPage=1;renderWork();[...$('#work-filters').children].find(b=>b.textContent===label)?.focus({preventScroll:true})};$('#work-filters').append(b)});
    $('#work-pages').replaceChildren();
    for(let n=1;n<=pages;n++){const b=document.createElement('button');b.type='button';b.textContent=n;b.setAttribute('aria-label',`Work page ${n}`);if(n===workPage)b.setAttribute('aria-current','page');b.onclick=()=>{workPage=n;renderWork();$('#work').scrollIntoView({block:'start',behavior:'instant'});$('#work-pages [aria-current]')?.focus({preventScroll:true})};$('#work-pages').append(b)}
  }
  renderWork();
  function selectHero(p){
    stop();const a=document.createElement('a');a.className='reel';if(['1. Xiaomi 90 Points Suitcase-.mp4','11-samsung-s25-ultra.mp4'].includes(p.film.filename))a.classList.add('portrait-reel');a.href=`#project/${p.slug}`;a.setAttribute('aria-label',`Watch ${p.title}`);
    const img=new Image();img.src=url(p.heroPoster||p.film.poster);img.alt=`Still from ${p.title}`;img.fetchPriority='high';
    img.addEventListener('error',()=>{img.src=url(p.film.poster)},{once:true});
    const v=document.createElement('video');v.muted=true;v.loop=true;v.playsInline=true;v.preload='none';v.setAttribute('aria-hidden','true');
    const label=document.createElement('span');label.className='reel-label';const play=document.createElement('b');play.textContent='▶';play.setAttribute('aria-hidden','true');const copy=document.createElement('span');copy.textContent='WATCH FILM';const title=document.createElement('em');title.textContent=p.title;copy.append(title);label.append(play,copy);a.append(img,v,label);
    a.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch')preview(a,v,p)});a.addEventListener('pointerleave',stop);a.addEventListener('focus',()=>preview(a,v,p));a.addEventListener('blur',stop);
    $('#reel').replaceChildren(a);[...$('#hero-selector').children].forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.slug===p.slug)));
  }
  heroProjects.forEach((p,index)=>{const b=document.createElement('button');b.type='button';b.dataset.slug=p.slug;const type=document.createElement('small');type.textContent=`0${index+1} / ${p.type}`;b.append(type,document.createTextNode(p.title));b.onclick=()=>selectHero(p);$('#hero-selector').append(b)});
  if(projects.length)selectHero(projects.find(p=>p.slug==='montage-ai-flow')||projects[0]);
  const header=$('.site-header');const updateHeader=()=>header.classList.toggle('scrolled',scrollY>40);window.addEventListener('scroll',updateHeader,{passive:true});updateHeader();
  const intro=$('#brand-intro'),reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
  let introTimer,restoreIntroFocus;
  const introBackground=[...document.querySelectorAll('body > header,body > main,body > footer,body > .skip')];
  function finishIntro(){
    if(intro.hidden)return;clearTimeout(introTimer);intro.hidden=true;intro.classList.remove('playing');document.body.classList.remove('intro-running');introBackground.forEach(el=>el.inert=false);
    if(restoreIntroFocus?.isConnected)restoreIntroFocus.focus({preventScroll:true});
  }
  function playIntro(){
    stop();restoreIntroFocus=document.activeElement===document.body?$('.site-header .logo'):document.activeElement;
    intro.hidden=false;intro.classList.remove('playing');document.body.classList.add('intro-running');introBackground.forEach(el=>el.inert=true);$('#skip-intro').focus({preventScroll:true});
    void intro.offsetWidth;intro.classList.add('playing');clearTimeout(introTimer);introTimer=setTimeout(finishIntro,reducedMotion.matches?500:6500);
  }
  $('#skip-intro').addEventListener('click',finishIntro);
  reducedMotion.addEventListener('change',e=>{if(e.matches){stop();finishIntro()}});
  intro.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();finishIntro()}else if(e.key==='Tab'){e.preventDefault();$('#skip-intro').focus()}});
  intro.addEventListener('animationend',e=>{if(e.target===intro&&e.animationName==='intro-exit')finishIntro()});
  if(location.hash==='#more-work'){history.replaceState(null,'','#work');$('#work').scrollIntoView({behavior:'instant'})}
  if((!location.hash||location.hash==='#home')&&!reducedMotion.matches)playIntro();
  if(!matchMedia('(prefers-reduced-motion: reduce)').matches&&'IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target)}}),{threshold:.08});document.querySelectorAll('.section-heading,.studio-layout,.contact-title').forEach(el=>{el.classList.add('reveal-ready');observer.observe(el)})}
  $('#close-project').addEventListener('click',()=>dialog.close());dialog.addEventListener('close',()=>{video.pause();video.removeAttribute('src');video.load();if(location.hash.startsWith('#project/'))history.replaceState(null,'','#work');returnFocus?.focus({preventScroll:true})});video.addEventListener('error',()=>{if(dialog.open)$('#video-error').hidden=false});document.addEventListener('visibilitychange',()=>{if(document.hidden){stop();video.pause()}});window.addEventListener('hashchange',route);route();
})();
