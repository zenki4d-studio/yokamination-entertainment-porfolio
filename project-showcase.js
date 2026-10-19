(() => {
  'use strict';
  const make=(tag,className,text)=>{const el=document.createElement(tag);if(className)el.className=className;if(text)el.textContent=text;return el};
  function artwork(item,wide=false){
    const variants=window.PROJECT_ARTWORK?.[item.image]?.variants;if(!variants?.length)return document.createDocumentFragment();
    const small=variants.find(v=>v.width>=1280)||variants.at(-1),large=variants.at(-1);
    const figure=make('figure','showcase-artwork'),link=make('a');
    link.href=large.src;link.target='_blank';link.rel='noopener';link.setAttribute('aria-label',`View artwork: ${item.title||'Project artwork'} (opens in new tab)`);
    const img=new Image();img.src=small.src;img.srcset=variants.map(v=>`${v.src} ${v.width}w`).join(', ');
    img.sizes=wide?'(max-width:600px) 88vw, 1160px':'(max-width:600px) 88vw, 560px';
    img.alt=item.alt;img.width=small.width;img.height=small.height;img.loading='lazy';img.decoding='async';
    link.append(img);figure.append(link);
    if(item.title||item.text){const caption=make('figcaption');if(item.title)caption.append(make('strong','',item.title));if(item.text)caption.append(make('p','',item.text));figure.append(caption)}
    return figure;
  }
  function gallery(items,wide=false){const grid=make('div',wide?'showcase-gallery showcase-gallery--wide':'showcase-gallery');items.forEach(item=>grid.append(artwork(item,wide)));return grid}
  function section(title,text){const el=make('section','showcase-section');el.append(make('h3','',title));if(text)el.append(make('p','showcase-section-intro',text));return el}
  window.renderProjectStory=p=>{
    const root=document.querySelector('#project-editorial');if(!root)return false;
    root.replaceChildren();const story=window.PROJECT_STORIES?.[p.slug];root.hidden=!story;if(!story)return false;
    const pitch=make('section','showcase-pitch');
    pitch.append(make('p','eyebrow',story.eyebrow),make('h3','showcase-tagline',story.tagline),make('p','showcase-logline',story.summary));
    const facts=make('dl','showcase-facts');story.facts.forEach(([label,value])=>{const item=make('div');item.append(make('dt','',label),make('dd','',value));facts.append(item)});pitch.append(facts);
    const about=section('About the project');story.paragraphs.forEach(text=>about.append(make('p','showcase-copy',text)));
    about.append(gallery([story.leadArtwork],true));
    const world=section(story.world.title,story.world.text);world.append(gallery(story.world.images));
    const cast=section('Characters');cast.append(gallery(story.characters));
    const behind=section(story.behind.title,story.behind.introduction);
    story.behind.sections.forEach((item,index)=>{const part=make('section','showcase-chapter');part.append(make('p','eyebrow',`0${index+1} / THE MAKING`),make('h4','',item.title),make('p','showcase-copy',item.text));if(item.images)part.append(gallery(item.images,item.images.length===1));behind.append(part)});
    const music=section('Soundtrack','Three tracks accompany the village, chase and closing sequences. Sound effects are produced separately for each shot.');
    const tracks=make('div','showcase-tracks');story.music.forEach((track,index)=>{const item=make('article');item.append(make('span','eyebrow',`0${index+1}`),make('h4','',track.title),make('p','',track.text));tracks.append(item)});music.append(tracks);
    const credits=section('Production credits');const list=make('dl','showcase-credits');story.credits.forEach(([role,name])=>{const item=make('div');item.append(make('dt','',role),make('dd','',name));list.append(item)});credits.append(list,make('p','showcase-tool-label','CREATIVE TOOLKIT'),make('p','showcase-toolkit',story.tools));
    const close=make('div','showcase-closing');const contact=make('a','text-link',story.cta);contact.href='mailto:yokamination@gmail.com';close.append(contact);
    root.append(pitch,about,world,cast,behind,music,credits,close);return true;
  };
})();
