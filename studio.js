(() => {
  'use strict';
  function redirectStudio(){if(location.hash==='#about'){location.replace(`studio.html${location.search}`);return true}return false}
  if(redirectStudio())return;
  const films=window.FILMS||[];
  // Replace these summaries with approved case-study copy when production material is available.
  const projects=[
    {slug:'the-ai-kuroichi',title:'The AI Kuroichi',type:'AI Game Cinematic',film:films.find(f=>f.filename==='The Ai Kuroichi.mp4'),summary:'An AI game cinematic from Yokamination. Watch the complete film above.'},
    {slug:'montage-ai-flow',title:'Montage AI Flow',type:'Montage AI Catalog',film:films.find(f=>f.filename==='Montage AI Flow.mp4'),summary:'A selection of Yokamination AI imagery, brought together in one showreel.'},
    {slug:'canh-chim-lac-hong',title:'Cánh chim Lạc Hồng',type:'AI Cartoon',film:films.find(f=>f.filename==='261015_Trailer_Cánh chim Lạc Hồng_4K 16_9.mp4'),summary:'An AI animated trailer. Watch the full Cánh chim Lạc Hồng trailer above.'},
    {slug:'troi-mua-cho-moi-an-ga',title:'Trời mưa cho mối ăn gà',type:'AI Cartoon',film:films.find(f=>f.filename==='261014 - Troi Mua Cho Moi Bat Ga.mp4'),summary:'An AI animated film from the Yokamination collection. Watch the complete film above.'},
    {slug:'angle-valve-ad',title:'Angle Valve Ad',type:'AI 3D Product',film:films.find(f=>f.filename==='260827 -  Angle valve Ad.mov'),summary:'A product advertising film featuring an angle valve. Watch the complete film above.'}
  ].filter(p=>p.film);
  const groupLabels={'AI GAME CINEMATIC':'AI Game Cinematic','MONTAGE AI CATALOG':'Montage AI Catalog','AI CARTOON':'AI Cartoon','AI 3D PRODUCT':'AI 3D Product','AI SOCIAL':'AI Social'};
  const displayTitles={'261001 - Design P-Trap Ad.mp4':'Design P-Trap Ad','260629_Toillet Brush Ad 24fps.mov':'Toilet Brush Ad','260520 Upwork - 1 Curtain Rod no Drilling Video Ad Conzept.mp4':'Curtain Rod — No Drilling','TIKTOPSHOP AI.mp4':'TikTok Shop AI','7. GrowPlus+ Váng Sữa_1.mp4':'GrowPlus+ Váng Sữa'};
  const supporting=films.filter(f=>!projects.some(p=>p.film.id===f.id)).map(f=>({slug:`film-${f.id}`,title:displayTitles[f.filename]||f.title,type:groupLabels[f.group]||f.group,film:f}));
  const allProjects=[...projects,...supporting];
  const heroProjects=projects;
  heroProjects.forEach(p=>{p.heroPoster=`assets/hero-posters/${p.film.id}.jpg`});
  // These two films begin with black leaders. Full project playback still starts at zero.
  const previewStarts={'The Ai Kuroichi.mp4':3,'Montage AI Flow.mp4':3};
  const $=s=>document.querySelector(s),url=s=>s.split('/').map(encodeURIComponent).join('/');
  const dialog=$('#project-dialog'),video=$('#project-video');let active=null,returnFocus=null;
  $('#film-total').textContent=films.length;
  function stop(){
    const previous=active;if(!previous)return;active=null;
    previous.cleanup?.();previous.link.classList.remove('previewing');
    previous.video.pause();previous.video.removeAttribute('src');previous.video.load();
    syncHeroPlayback();
  }
  function preview(link,v,p){
    stop();if(matchMedia('(prefers-reduced-motion: reduce)').matches||dialog.open||!$('#brand-intro').hidden)return;
    const session={link,video:v};active=session;syncHeroPlayback();
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
  function open(p){stop();if(!dialog.open)returnFocus=document.activeElement;$('#project-title').textContent=p.title;$('#project-type').textContent=p.type;$('#project-summary').textContent=p.summary||'';['.project-overview','.process-heading','.process-grid'].forEach(s=>$(s).hidden=!p.summary);video.src=url(p.film.src);video.poster=url(p.film.poster);$('#original').href=url(p.film.src);$('#video-error').hidden=true;if(!dialog.open)dialog.showModal();syncHeroPlayback();dialog.scrollTop=0;$('#project-title').focus({preventScroll:true})}
  function route(){if(redirectStudio())return;const hash=location.hash==='#project/the-ai-koreichi'?'#project/the-ai-kuroichi':location.hash;const p=allProjects.find(p=>hash===`#project/${p.slug}`);if(p)open(p);else if(dialog.open)dialog.close()}
  window.addEventListener('scroll',()=>{if(active){const r=active.link.getBoundingClientRect();if(r.bottom<=0||r.top>=innerHeight)stop()}syncHeroPlayback()},{passive:true});
  function projectCard(p){
    const a=document.createElement('a');a.className='project';
    if(p.film.height>p.film.width)a.classList.add('project--portrait');
    a.href=`#project/${p.slug}`;a.setAttribute('aria-label',`View project: ${p.title}`);
    const media=document.createElement('div');media.className='project-media';
    const img=new Image();img.src=url(p.film.poster);img.alt=`Still from ${p.title}`;img.loading='lazy';
    const v=document.createElement('video');v.muted=true;v.loop=true;v.playsInline=true;v.preload='none';v.setAttribute('aria-hidden','true');media.append(img,v);
    const info=document.createElement('div');info.className='project-info';const copy=document.createElement('div');
    const title=document.createElement('h3');title.textContent=p.title;const type=document.createElement('p');
    type.textContent=p.type+(/Upwork/i.test(p.film.filename)?' / UPWORK':'')+' / VIEW PROJECT';copy.append(title,type);
    const arrow=document.createElement('span');arrow.textContent='↗';info.append(copy,arrow);a.append(media,info);
    a.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch')preview(a,v,p)});a.addEventListener('pointerleave',stop);
    a.addEventListener('focus',()=>preview(a,v,p));a.addEventListener('blur',stop);return a;
  }
  let workFilter='All work',workPage=1;
  const workPageSize=6;
  function renderWork(){
    stop();
    const matches=allProjects.filter(p=>workFilter==='All work'||p.type===workFilter);
    const pages=Math.max(1,Math.ceil(matches.length/workPageSize));
    workPage=Math.min(workPage,pages);
    $('#more-grid').replaceChildren(...matches.slice((workPage-1)*workPageSize,workPage*workPageSize).map(projectCard));
    $('#work-count').textContent=`${matches.length} films · Page ${workPage} of ${pages}`;
    $('#work-filters').replaceChildren();
    ['All work',...Object.values(groupLabels).filter(type=>allProjects.some(p=>p.type===type))].forEach(label=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.setAttribute('aria-pressed',String(label===workFilter));b.onclick=()=>{workFilter=label;workPage=1;renderWork();[...$('#work-filters').children].find(b=>b.textContent===label)?.focus({preventScroll:true})};$('#work-filters').append(b)});
    $('#work-pages').replaceChildren();
    for(let n=1;n<=pages;n++){const b=document.createElement('button');b.type='button';b.textContent=n;b.setAttribute('aria-label',`Work page ${n}`);if(n===workPage)b.setAttribute('aria-current','page');b.onclick=()=>{workPage=n;renderWork();$('#work').scrollIntoView({block:'start',behavior:'instant'});$('#work-pages [aria-current]')?.focus({preventScroll:true})};$('#work-pages').append(b)}
  }
  renderWork();
  // Hero playback has its own lifecycle; card hover never tears down the featured film.
  const HERO_PREVIEW_SECONDS=7;
  const heroMotion=matchMedia('(prefers-reduced-motion: reduce)');
  const heroToggle=$('#hero-toggle');
  let heroSession=null,heroIndex=0,heroPaused=heroMotion.matches,heroPauseChoice=false,heroInitializing=true;
  function heroCanPlay(){
    const r=$('.hero').getBoundingClientRect();
    return !heroInitializing&&!heroPaused&&!active&&!document.hidden&&!dialog.open&&$('#brand-intro').hidden&&r.bottom>80&&r.top<innerHeight;
  }
  function updateHeroToggle(){
    heroToggle.textContent=heroPaused?'▶ Play previews':'Ⅱ Pause previews';
    heroToggle.setAttribute('aria-label',heroPaused?'Play featured film previews':'Pause featured film previews');
    heroToggle.setAttribute('aria-pressed',String(!heroPaused));
  }
  function syncHeroPlayback(){
    const session=heroSession;if(!session)return;
    if(!heroCanPlay()){
      session.video.pause();session.clearWatchdog();return;
    }
    if(session.failed){selectHero(heroIndex);return}
    session.load();
    if(!session.ready){session.armWatchdog();return}
    if(!session.video.paused||session.playPending)return;
    session.playPending=true;session.armWatchdog();
    session.video.play().catch(error=>{
      if(heroSession!==session||!heroCanPlay()||error.name==='AbortError')return;
      heroPaused=true;updateHeroToggle();session.clearWatchdog();
    }).finally(()=>{session.playPending=false;if(heroSession===session&&heroCanPlay()&&session.ready&&session.video.paused)syncHeroPlayback()});
  }
  function selectHero(index){
    const p=heroProjects[index];if(!p)return;
    heroSession?.cleanup();heroIndex=index;
    const a=document.createElement('a');a.className='reel';
    if(p.film.height>p.film.width)a.classList.add('portrait-reel');
    a.href=`#project/${p.slug}`;a.setAttribute('aria-label',`Watch ${p.title}`);
    const img=new Image();img.src=url(p.heroPoster||p.film.poster);img.alt=`Still from ${p.title}`;img.fetchPriority='high';
    img.addEventListener('error',()=>{img.src=url(p.film.poster)},{once:true});
    const v=document.createElement('video');v.muted=true;v.playsInline=true;v.preload='auto';v.poster=url(p.heroPoster||p.film.poster);v.setAttribute('aria-hidden','true');
    const label=document.createElement('span');label.className='reel-label';const play=document.createElement('b');play.textContent='▶';play.setAttribute('aria-hidden','true');const copy=document.createElement('span');copy.textContent='WATCH FILM';const title=document.createElement('em');title.textContent=p.title;copy.append(title);label.append(play,copy);a.append(img,v,label);
    const button=[...$('#hero-selector').children].find(b=>b.dataset.slug===p.slug);
    let frameRequest=null,watchdog=null,loaded=false,startAt=3;
    const session={video:v,ready:false,playPending:false,failed:false};heroSession=session;
    const current=()=>heroSession===session;
    const next=()=>{if(current())selectHero((heroIndex+1)%heroProjects.length)};
    session.clearWatchdog=()=>{clearTimeout(watchdog);watchdog=null};
    const failed=()=>{if(!current())return;session.failed=true;heroPaused=true;v.pause();session.clearWatchdog();a.classList.remove('previewing');updateHeroToggle()};
    session.armWatchdog=()=>{if(!watchdog)watchdog=setTimeout(failed,15000)};
    const present=(fromFrame=false)=>{
      if(!current()||!session.ready||v.paused||v.seeking||!heroCanPlay()||v.readyState<2)return;
      if(fromFrame===true||(!v.requestVideoFrameCallback&&v.currentTime>startAt+.05)){
        a.classList.add('previewing');session.clearWatchdog();
      }
      const elapsed=Math.max(0,v.currentTime-startAt);
      button?.style.setProperty('--preview-progress',`${Math.min(100,elapsed/HERO_PREVIEW_SECONDS*100)}%`);
      if(elapsed>=HERO_PREVIEW_SECONDS)next();
    };
    const frame=()=>{
      if(!current()||frameRequest!==null||!v.requestVideoFrameCallback)return;
      frameRequest=v.requestVideoFrameCallback((_,frameInfo)=>{frameRequest=null;if(frameInfo.mediaTime>=startAt-.05)present(true);if(current())frame()});
    };
    // Some servers initially clamp an early seek to zero. Wait for a real seekable range.
    const prepare=()=>{
      if(!current()||session.ready||v.seeking||!Number.isFinite(v.duration))return;
      if(v.currentTime>=startAt-.05){session.ready=true;syncHeroPlayback()}
      else if(v.seekable.length&&v.seekable.end(v.seekable.length-1)>=startAt)v.currentTime=startAt;
    };
    const metadata=()=>{startAt=Math.min(3,Math.max(0,v.duration-HERO_PREVIEW_SECONDS));prepare()};
    const playing=()=>{if(!heroCanPlay()){v.pause();return}if(v.requestVideoFrameCallback)frame();else present()};
    const waiting=()=>{if(heroCanPlay())session.armWatchdog()};
    const events={loadedmetadata:metadata,seeked:prepare,loadeddata:prepare,canplay:prepare,progress:prepare,playing,timeupdate:present,waiting,ended:next,error:failed};
    Object.entries(events).forEach(([name,handler])=>v.addEventListener(name,handler));
    session.load=()=>{if(loaded)return;loaded=true;session.armWatchdog();v.src=url(p.film.src);v.load()};
    session.cleanup=()=>{
      session.clearWatchdog();
      if(frameRequest!==null&&v.cancelVideoFrameCallback)v.cancelVideoFrameCallback(frameRequest);
      Object.entries(events).forEach(([name,handler])=>v.removeEventListener(name,handler));
      v.pause();v.removeAttribute('src');v.load();
    };
    $('#reel').replaceChildren(a);
    [...$('#hero-selector').children].forEach(b=>{b.setAttribute('aria-pressed',String(b===button));b.style.setProperty('--preview-progress','0%')});
    syncHeroPlayback();
  }
  heroProjects.forEach((p,index)=>{const b=document.createElement('button');b.type='button';b.dataset.slug=p.slug;const type=document.createElement('small');type.textContent=`0${index+1} / ${p.type.toUpperCase()}`;b.append(type,document.createTextNode(p.title));b.onclick=()=>selectHero(index);$('#hero-selector').append(b)});
  heroToggle.addEventListener('click',()=>{heroPaused=!heroPaused;heroPauseChoice=heroPaused;updateHeroToggle();syncHeroPlayback()});
  heroMotion.addEventListener('change',e=>{heroPaused=e.matches||heroPauseChoice;updateHeroToggle();syncHeroPlayback()});
  updateHeroToggle();if(heroProjects.length)selectHero(0);
  if('IntersectionObserver' in window)new IntersectionObserver(syncHeroPlayback,{threshold:[0,.1]}).observe($('.hero'));
  const header=$('.site-header');const updateHeader=()=>header.classList.toggle('scrolled',scrollY>40);window.addEventListener('scroll',updateHeader,{passive:true});updateHeader();
  const intro=$('#brand-intro'),reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
  let introTimer,restoreIntroFocus;
  const introBackground=[...document.querySelectorAll('body > header,body > main,body > footer,body > .skip')];
  function finishIntro(){
    if(intro.hidden)return;clearTimeout(introTimer);intro.hidden=true;intro.classList.remove('playing');document.body.classList.remove('intro-running');introBackground.forEach(el=>el.inert=false);
    if(restoreIntroFocus?.isConnected)restoreIntroFocus.focus({preventScroll:true});
    syncHeroPlayback();
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
  $('#close-project').addEventListener('click',()=>dialog.close());dialog.addEventListener('close',()=>{video.pause();video.removeAttribute('src');video.load();if(location.hash.startsWith('#project/'))history.replaceState(null,'','#work');returnFocus?.focus({preventScroll:true});syncHeroPlayback()});video.addEventListener('error',()=>{if(dialog.open)$('#video-error').hidden=false});document.addEventListener('visibilitychange',()=>{if(document.hidden){stop();video.pause()}syncHeroPlayback()});window.addEventListener('hashchange',route);route();
  heroInitializing=false;syncHeroPlayback();
})();
