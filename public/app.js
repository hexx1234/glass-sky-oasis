(() => {
  'use strict';
  let site = null;
  const $ = (selector, root=document) => root.querySelector(selector);
  const esc = (value='') => String(value??'').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const link = (value) => /^https?:\/\//i.test(String(value||'')) ? value : '';
  const mediaUrl = (value) => {
    const s=String(value||'');
    if(/^uploads\/[a-zA-Z0-9._-]+$/.test(s)) return `/api/media/${encodeURIComponent(s.split('/')[1])}`;
    if(/^https?:\/\//i.test(s))return s;
    return '';
  };
  const media = (image,label,extra='') => {
    const url=mediaUrl(image);
    return `<div class="image-stage ${extra}">${url ? `<img class="image-fit" src="${esc(url)}" alt="${esc(label)}" loading="lazy">` : `<div class="media-placeholder" aria-label="이미지 등록 예정"><span class="placeholder-text">${esc(label)}<br><span style="font-weight:400;letter-spacing:.05em">IMAGE COMING SOON</span></span></div>`}</div>`;
  };
  const arrow = '<span class="arrow" aria-hidden="true">↗</span>';
  const button = (href,title,primary=false) => `<a class="btn-link${primary?' primary':''}" href="${esc(href)}">${esc(title)} ${arrow}</a>`;
  const textlink = (href,title) => `<a class="text-link" href="${esc(href)}">${esc(title)} ${arrow}</a>`;
  const sectionLabel = (number,title,sub='',href='',cta='VIEW ALL') => `<div class="section-top"><div><div class="eyebrow">${esc(number)}</div><h2 class="section-title">${esc(title)}</h2>${sub?`<p class="section-desc">${esc(sub)}</p>`:''}</div>${href?textlink(href,cta):''}</div>`;
  const crumb = (parts) => `<div class="shell crumbs"><a href="#home">HOME</a>${parts.map(p=>`<span>/</span><span>${esc(p)}</span>`).join('')}</div>`;
  const banner = (tag,title,copy) => `<section class="page-banner"><div class="shell"><span class="eyebrow">${esc(tag)}</span><h1 class="route-heading">${esc(title)}</h1><p class="route-lead">${esc(copy)}</p></div></section>`;
  const empty = (value) => `<div class="empty-state">${esc(value)}</div>`;

  function charCard(c){
    return `<a class="participant-card" href="#person/${encodeURIComponent(c.id)}" aria-label="${esc(c.name)} 프로필 열기">${media(c.image,`${c.en||c.name} / CHARACTER ART`,'participant-art')}<div class="character-mark">${esc(c.species||'PARTICIPANT')}</div><div class="participant-caption"><div><strong>${esc(c.en||c.name)}</strong><span>${esc(c.name)} · ${esc(c.role||'')}</span></div><span class="circle-arrow" aria-hidden="true">↗</span></div></a>`;
  }
  function artCard(a){
    const character=(site.characters||[]).find(c=>c.id===a.characterId);
    return `<button type="button" class="art-card art-open" data-art="${esc(a.id)}" aria-label="${esc(a.title)} 이미지 확대">${media(a.image,a.title||'ARTWORK','art-thumb')}<div class="art-info"><strong>${esc(a.title||'Untitled')}</strong><p>${esc(character?.name||'')} ${a.artist?` · ART BY ${esc(a.artist)}`:''}</p></div></button>`;
  }
  function newsCard(n){
    return `<article class="media-card">${media(n.image, n.category||'GSO NEWS')}<div class="media-card-footer"><span>${esc(n.category||'NEWS')} · ${esc(n.date||'')}</span><strong>${esc(n.title)}</strong></div></article>`;
  }
  function home(){
    const s=site.settings, cs=site.characters||[], arts=site.artworks||[], news=site.news||[];
    const featured=arts[0];const recent=news[0];
    return `
      <section class="hero"><div class="hero-copy"><div class="eyebrow">${esc(s.heroEyebrow)}</div><h1>${esc(s.heroTitle)}</h1><p class="description">${esc(s.heroDescription)}</p>${button('#world','DISCOVER OUR WORLD',true)}</div><div class="hero-visual">${media(s.heroImage,'GLASS SKY OASIS / CITY VISUAL')}<div class="hero-bottom" aria-hidden="true"><i class="hero-dot"></i><i class="hero-dot"></i><i class="hero-dot"></i></div></div></section>
      <div class="shell quick-links"><a class="quick-card" href="#world">OUR WORLD ${arrow}</a><a class="quick-card" href="#business">BUSINESS ${arrow}</a><a class="quick-card" href="#zone">BUBBLE ZONE ${arrow}</a><a class="quick-card" href="#archive">ARCHIVE ${arrow}</a></div>
      <section class="about-strip"><div class="shell about-strip-inner"><div class="eyebrow">02 / ${esc(s.introEyebrow||'ABOUT GSO')}</div><h2>${esc(s.introTitle)}</h2><p>${esc(s.introText)}</p>${textlink('#world','EXPLORE OUR WORLD')}</div><div class="about-wave" aria-hidden="true"><svg viewBox="0 0 1200 62" preserveAspectRatio="none"><path d="M0 37 C180 -6 280 78 445 48 C575 20 665 62 815 32 C1005 -8 1080 45 1200 30 L1200 62 L0 62 Z" fill="currentColor"/></svg></div></section>
      <section class="section business-home"><div class="shell"><div class="business-layout"><div class="business-intro"><div class="eyebrow">03 / OUR BUSINESS</div><h2 class="section-title">Connecting<br>our future.</h2><p class="section-desc">도시의 일상과 미래를 움직이는 핵심 사업을 소개합니다.</p>${button('#business','OUR BUSINESS')}</div><a class="business-card" href="#business">${media('','BUBBLE ENERGY','business-visual')}<div class="business-card-footer"><div><strong>Bubble Energy</strong><small>핵심 에너지 시스템</small></div><span class="circle-arrow">↗</span></div></a><a class="business-card" href="#business">${media('','CITIZEN SERVICE','business-visual')}<div class="business-card-footer"><div><strong>Citizen Service</strong><small>시민 생활 서비스</small></div><span class="circle-arrow">↗</span></div></a></div></div></section>
      <section class="zone-band"><div class="shell">${sectionLabel('04 / BUBBLE ZONE','Beyond the ordinary.','공식 엔터테인먼트 플랫폼, 버블존.','#zone','EXPLORE')}<div class="zone-content">${media(s.zoneImage,'BUBBLE ZONE / BROADCAST','zone-visual')}<div class="zone-copy"><div class="eyebrow">BUBBLE ZONE · OFFICIAL PLATFORM</div><h3>모든 도전이<br>기회가 되는 무대.</h3><p>${esc(s.zoneText)}</p>${button('#zone','BUBBLE ZONE')}</div></div></div></section>
      <section class="participant-section"><div class="shell">${sectionLabel('05 / PARTICIPANTS','Official participants.','버블존에 등록된 참가자들의 공식 프로필을 열람하세요.','#participants','ALL PARTICIPANTS')}<div class="participants-row">${cs.slice(0,3).map(charCard).join('')}${cs.length>3?charCard(cs[3]):`<a class="participant-extra" href="#participants">EXPLORE ALL ${arrow}</a>`}</div></div></section>
      <section class="media-section"><div class="shell">${sectionLabel('06 / NEWS & MEDIA','Latest from GSO.','공식 뉴스, 신규 일러스트와 커미션 기록을 확인하세요.','#archive','MEDIA CENTER')}<div class="media-grid"><a href="#archive" class="media-card">${featured?media(featured.image,featured.title):media('','FEATURED ARTWORK')}<div class="media-card-footer"><span>ARTWORK</span><strong>${esc(featured?.title||'Featured artwork')}</strong></div></a><a href="#archive" class="media-card">${arts[1]?media(arts[1].image,arts[1].title):media('','ILLUSTRATION GALLERY')}<div class="media-card-footer"><span>GALLERY</span><strong>Media archive</strong></div></a><a href="#archive" class="media-card">${recent?media(recent.image,recent.title):media('','OFFICIAL NEWS')}<div class="media-card-footer"><span>PRESS & UPDATE</span><strong>${esc(recent?.title||'Corporate news')}</strong></div></a></div></div></section>`;
  }
  function world(){
    const s=site.settings;
    const stages=[
      {n:'01',title:'디지털 낙원의 운영',copy:'자율 AI와 버블 에너지로 도시 전체의 기반 시스템을 유지합니다.'},
      {n:'02',title:'에너지 순환의 불안정',copy:'도시의 자원 가치 변화와 함께 버블 순환 체계가 흔들리기 시작합니다.'},
      {n:'03',title:'버블 랭킹 시스템 도입',copy:'정부 지도자들은 에너지 절약과 질서 유지를 위해 경쟁 기반의 랭킹 제도를 마련합니다.'}
    ];
    return `${banner('INFORMATION / OUR WORLD','Our World.','글래스 스카이 오아시스의 역사와 사회, 종족과 에너지 체계를 소개합니다.')}${crumb(['OUR WORLD'])}
    <section class="content-section"><div class="shell editorial-grid"><div><div class="eyebrow">01 / OVERVIEW</div><h2>Welcome to<br>Glass Sky Oasis.</h2></div><p class="body-copy">${esc(s.worldOverview)}</p></div></section>
    <section class="content-section alt"><div class="shell"><div class="eyebrow">02 / HISTORY & SYSTEM ORIGIN</div><h2 class="section-title">시스템의 탄생 배경</h2><p class="section-desc">구체적인 연도와 사건 기록은 추후 공개 예정입니다. 현재 확인 가능한 사건의 흐름을 소개합니다.</p><div class="data-steps">${stages.map(t=>`<article class="data-step"><div class="step-num">STAGE / ${t.n}</div><h3>${t.title}</h3><p>${t.copy}</p></article>`).join('')}</div><div class="article-slab"><h3>버블 랭킹 시스템</h3><p>${esc(s.worldBackground)}</p></div></div></section>
    <section class="content-section"><div class="shell editorial-grid"><div><div class="eyebrow">03 / SOCIAL STRUCTURE</div><h2>클래스와<br>시민의 권리</h2></div><div><p class="body-copy">${esc(s.worldSociety)}</p><div class="article-slab"><h3>버블 ≠ 화폐</h3><p>클래스는 부의 크기와 동일하지 않으며, 시민의 에너지와 생활 인프라 접근 우선권에 영향을 줍니다.</p></div></div></div></section>
    <section class="content-section alt"><div class="shell"><div class="eyebrow">04 / SPECIES DATABASE</div><h2 class="section-title">세 종족의 기록</h2><div class="species-grid">${site.species.map(t=>`<article class="species-card"><div class="species-code">SPECIES / ${esc(t.en)}</div><h3>${esc(t.name)}</h3><div class="species-tag">${esc(t.tag)}</div><p>${esc(t.description)}</p></article>`).join('')}</div></div></section>`;
  }
  function business(){
    const s=site.settings;
    const items=[{n:'01',name:'Bubble Energy',category:'ENERGY',text:s.energyText},{n:'02',name:'Citizen Service',category:'PUBLIC SERVICES',text:s.citizenText},{n:'03',name:'Media & Broadcast',category:'ENTERTAINMENT',text:'버블존의 경기와 참가자 활동을 세계에 소개하는 공식 방송 및 미디어 사업입니다.'}];
    return `${banner('BUSINESS / GSO','Our Business.','에너지부터 시민 서비스와 엔터테인먼트까지, GLASS SKY OASIS의 핵심 운영 영역입니다.')}${crumb(['BUSINESS'])}<section class="content-section"><div class="shell"><div class="eyebrow">BUSINESS PORTFOLIO</div><h2 class="section-title">Connected ecosystem.</h2><div class="business-page-grid">${items.map(t=>`<article class="business-page-card">${media('',t.category)}<div class="business-page-info"><div class="eyebrow">${t.n} / ${t.category}</div><h3>${esc(t.name)}</h3><p>${esc(t.text)}</p>${t.n==='03'?textlink('#zone','EXPLORE BUBBLE ZONE'):textlink('#world','MORE ABOUT OUR WORLD')}</div></article>`).join('')}</div><div class="business-callout"><p>버블존의 경기·방송 운영과 참가자 기록을 살펴보세요.</p>${button('#zone','BUBBLE ZONE')}</div></div></section>`;
  }
  function zone(){
    const s=site.settings;
    const rules=[{n:'01',title:'자유 참가',text:'국가 내 시민이라면 참가할 수 있으며, 참가 자체는 의무가 아닙니다.'},{n:'02',title:'버블 획득',text:'참가자들은 전투 서바이벌에서 다른 참가자를 쓰러뜨려 버블을 획득합니다.'},{n:'03',title:'클래스 상승',text:'더 많은 버블을 모으면 높은 클래스에 도전하고 여러 생활 우선권을 얻을 수 있습니다.'}];
    return `${banner('ENTERTAINMENT / BUBBLE ZONE','Bubble Zone.','새로운 기회와 치열한 경쟁이 만나는 무대. 시민 참여형 전투 엔터테인먼트 플랫폼입니다.')}${crumb(['BUBBLE ZONE'])}<section class="content-section"><div class="shell zone-top-story">${media(s.zoneImage,'BUBBLE ZONE / OFFICIAL STAGE')}<div><div class="eyebrow">01 / ENTER THE ZONE</div><h2>Welcome to<br>Bubble Zone.</h2><p class="body-copy">${esc(s.zoneText)}</p>${button('#participants','MEET THE PARTICIPANTS')}</div></div></section><section class="content-section alt"><div class="shell"><div class="eyebrow">02 / HOW IT WORKS</div><h2 class="section-title">버블존 참가 안내</h2><div class="rule-grid">${rules.map(t=>`<article class="rule-card"><div class="number">STEP / ${t.n}</div><h3>${t.title}</h3><p>${t.text}</p></article>`).join('')}</div></div></section><section class="content-section"><div class="shell">${sectionLabel('03 / OFFICIAL DATABASE','Meet the participants.','버블존 공식 등록 참가자 목록을 확인하세요.','#participants','VIEW ALL')}<div class="directory-grid">${(site.characters||[]).slice(0,3).map(charCard).join('')}</div></div></section>`;
  }
  function participants(){
    return `${banner('BUBBLE ZONE / DATABASE','Participants.','버블존 참가자의 능력과 개별 기록을 열람할 수 있는 공식 데이터베이스입니다.')}${crumb(['PARTICIPANTS'])}<section class="content-section"><div class="shell"><div class="eyebrow">REGISTERED PARTICIPANTS</div><div class="directory-controls"><input id="participant-search" class="search-input" type="search" placeholder="참가자 이름 또는 무기 검색" aria-label="참가자 검색"><select id="species-filter" class="filter-select" aria-label="종족 필터"><option value="">전체 종족</option>${[...new Set((site.characters||[]).map(c=>c.species).filter(Boolean))].map(s=>`<option value="${esc(s)}">${esc(s)}</option>`).join('')}</select></div><div id="directory-cards" class="directory-grid">${(site.characters||[]).map(charCard).join('')}</div></div></section>`;
  }
  function person(id){
    const c=(site.characters||[]).find(c=>c.id===id);
    if(!c)return `${banner('DATABASE / NOT FOUND','Record not found.','요청한 참가자 기록을 찾을 수 없습니다.')}${crumb(['PARTICIPANTS'])}<section class="content-section"><div class="shell">${button('#participants','BACK TO DIRECTORY')}</div></section>`;
    const arts=(site.artworks||[]).filter(a=>a.characterId===c.id);
    return `${crumb(['PARTICIPANTS',c.name])}<div class="shell detail-head">${media(c.image,c.name+' / OFFICIAL PORTRAIT','detail-photo')}<div class="detail-meta"><div class="eyebrow">OFFICIAL PLAYER RECORD / ${esc(c.registration||c.id)}</div><h1>${esc(c.en||c.name)}</h1><div class="detail-kor">${esc(c.name)}</div><dl class="meta-table"><dt>SPECIES</dt><dd>${esc(c.species)}</dd><dt>AGE</dt><dd>${esc(c.age)}</dd><dt>POSITION</dt><dd>${esc(c.role)}</dd><dt>ATTRIBUTE</dt><dd>${esc(c.attribute)}</dd><dt>WEAPON</dt><dd>${esc(c.weapon)}</dd></dl></div></div><nav class="detail-tabs" aria-label="프로필 목차"><div class="shell"><a href="#profile-record">PROFILE</a><a href="#combat-record">COMBAT</a><a href="#story-record">STORY</a><a href="#gallery-record">GALLERY</a></div></nav><section class="content-section" id="profile-record"><div class="shell detail-grid"><div><div class="eyebrow">01 / PERSONAL RECORD</div><h2 class="detail-subhead">Profile</h2><p class="large-lead">${esc(c.description)}</p></div><aside class="detail-aside"><div class="eyebrow">QUICK REFERENCE</div><p>${esc(c.name)} / ${esc(c.species)}</p><p>${esc(c.role)}</p><p>${esc(c.weapon)}</p></aside></div></section><section class="content-section alt" id="combat-record"><div class="shell detail-grid"><div><div class="eyebrow">02 / COMBAT RECORD</div><h2 class="detail-subhead">Skills & equipment</h2><ul class="skill-list">${(c.skills||[]).map(skill=>`<li>${esc(skill)}</li>`).join('')||'<li>전투 기록 등록 예정</li>'}</ul></div><aside class="detail-aside"><div class="eyebrow">EQUIPMENT</div><p>${esc(c.weapon)}</p><div class="eyebrow">ATTRIBUTE</div><p>${esc(c.attribute)}</p></aside></div></section><section class="content-section" id="story-record"><div class="shell detail-grid"><div><div class="eyebrow">03 / BACKGROUND</div><h2 class="detail-subhead">Story & relations</h2><p class="body-copy">${esc(c.story||'추가 서사 등록 예정')}</p><h3 style="margin-top:45px">Relationships</h3><p class="relations-note">${esc(c.relations||'관련 인물 기록 등록 예정')}</p></div></div></section><section class="content-section alt" id="gallery-record"><div class="shell">${sectionLabel('04 / MEDIA ASSETS','Artwork gallery.','참가자 관련 일러스트, 커미션 및 이미지 자료를 살펴보세요.','#archive','ALL ARTWORKS')}${arts.length?`<div class="art-grid">${arts.map(artCard).join('')}</div>`:empty('아직 등록된 작품이 없습니다. 관리자 페이지에서 커미션과 일러스트를 추가할 수 있습니다.')}</div></section>`;
  }
  function archive(){
    const arts=site.artworks||[]; const news=site.news||[];
    return `${banner('MEDIA / PUBLIC ARCHIVE','Archive.','커미션, 공식 일러스트, 기록 이미지와 최신 기업 소식을 보관하는 미디어 자료실입니다.')}${crumb(['ARCHIVE'])}<section class="content-section"><div class="shell"><div class="eyebrow">01 / ARTWORK LIBRARY</div><h2 class="section-title">Illustrations & commissions.</h2><p class="section-desc">작품을 선택하면 크게 감상할 수 있습니다. 작가 크레딧은 각 작품에 표시됩니다.</p><div class="filter-row" style="margin-top:30px"><button class="filter-btn active" data-kind="all">ALL</button><button class="filter-btn" data-kind="commission">COMMISSION</button><button class="filter-btn" data-kind="original">ORIGINAL</button><button class="filter-btn" data-kind="fanart">FAN ART</button></div><div id="art-cards">${arts.length?`<div class="art-grid">${arts.map(artCard).join('')}</div>`:empty('등록된 작품이 없습니다. 커미션이나 일러스트를 업로드하면 여기에 전시됩니다.')}</div></div></section><section class="content-section alt"><div class="shell"><div class="eyebrow">02 / PRESS & NEWS</div><h2 class="section-title">Official updates.</h2><div style="height:30px"></div>${news.length?`<div class="news-list">${news.map(n=>`<article class="news-row">${media(n.image,n.title)}<div><div class="eyebrow">${esc(n.category||'NEWS')}</div><h3>${esc(n.title)}</h3><p>${esc(n.summary||'')}</p></div><time>${esc(n.date||'')}</time></article>`).join('')}</div>`:empty('아직 공개된 보도자료가 없습니다.')}</div></section><dialog id="art-dialog" class="art-dialog"><button class="dialog-close" id="dialog-close" aria-label="닫기">✕</button><div id="dialog-inner"></div></dialog>`;
  }
  function render(){
    if(!site)return;
    const fragment=(location.hash||'#home').slice(1);
    const [route,slug]=fragment.split('/');
    const main=$('#app');
    let body='';
    switch(route){case 'world':body=world();break;case 'business':body=business();break;case 'zone':body=zone();break;case 'participants':body=participants();break;case 'archive':body=archive();break;case 'person':body=person(decodeURIComponent(slug||''));break;default:body=home();}
    main.innerHTML=body;
    $$('.desktop-nav a').forEach(a=>a.classList.toggle('active',a.dataset.nav===route || (route==='person'&&a.dataset.nav==='participants')));
    $('#mobile-nav').hidden=true;$('#menu-toggle').setAttribute('aria-expanded','false');
    document.title=`${route==='home'?'GLASS SKY OASIS':route==='person'?'PLAYER PROFILE':route.toUpperCase()} · GLASS SKY OASIS`;
    if(route==='participants') setupDirectory();
    if(route==='archive') setupArchive();
    if(location.hash.startsWith('#person/'))setupArtworkDialog();
    window.scrollTo({top:0,behavior:'instant'});
  }
  function $$(selector,root=document){return [...root.querySelectorAll(selector)];}
  function setupDirectory(){
    const search=$('#participant-search'), select=$('#species-filter'),target=$('#directory-cards');
    function apply(){const term=search.value.trim().toLowerCase(),spec=select.value;const matches=(site.characters||[]).filter(c=>(!spec||c.species===spec)&&(!term||[c.name,c.en,c.weapon,c.role].join(' ').toLowerCase().includes(term)));target.innerHTML=matches.length?matches.map(charCard).join(''):empty('검색 결과가 없습니다.');}
    search.addEventListener('input',apply);select.addEventListener('change',apply);
  }
  function setupArchive(){
    $$('.filter-btn').forEach(button=>button.addEventListener('click',()=>{
      $$('.filter-btn').forEach(b=>b.classList.remove('active'));button.classList.add('active');
      const kind=button.dataset.kind;
      const matches=(site.artworks||[]).filter(a=>kind==='all'||a.kind===kind);
      $('#art-cards').innerHTML=matches.length?`<div class="art-grid">${matches.map(artCard).join('')}</div>`:empty('이 분류에 등록된 작품이 없습니다.');
    }));
    setupArtworkDialog();
  }
  function setupArtworkDialog(){
    // Event delegation survives filter changes and avoids duplicate listeners.
    const main=$('#app');
    if(!$('#art-dialog'))main.insertAdjacentHTML('beforeend','<dialog id="art-dialog" class="art-dialog"><button class="dialog-close" id="dialog-close" aria-label="닫기">✕</button><div id="dialog-inner"></div></dialog>');
    const dialog=$('#art-dialog');
    main.addEventListener('click',event=>{
      const button=event.target.closest('[data-art]');
      if(button){
        const a=(site.artworks||[]).find(a=>a.id===button.dataset.art);
        if(!a)return;
        const src=mediaUrl(a.image),artistUrl=link(a.artistUrl);
        $('#dialog-inner').innerHTML=`<div class="lightbox-art">${src?`<img src="${esc(src)}" alt="${esc(a.title)}">`:media('',a.title)}</div><div class="lightbox-info"><div class="eyebrow">${esc(a.kind||'ARTWORK')}</div><h2>${esc(a.title)}</h2><p>${esc(a.description||'')}</p><p><strong>ARTIST</strong> ${artistUrl?`<a href="${esc(artistUrl)}" target="_blank" rel="noopener noreferrer">${esc(a.artist||'작가 페이지')} ↗</a>`:esc(a.artist||'미등록')}</p></div>`;
        dialog.showModal();
      }
      if(event.target.id==='dialog-close')dialog.close();
      if(event.target===dialog)dialog.close();
    });
  }
  async function init(){
    if (window.GSO_PREVIEW_DATA) { site=window.GSO_PREVIEW_DATA; render(); return; }
    try{
      let r=await fetch('/api/data',{cache:'no-store'});
      if(!r.ok)r=await fetch('/data/site.json',{cache:'no-store'});
      if(!r.ok)throw new Error('data unavailable');
      const result=await r.json();site=result.data||result;
      render();
    }catch(err){$('#app').innerHTML='<div class="shell initial-loading" role="alert">사이트 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</div>';console.error(err);}
  }
  $('#menu-toggle').addEventListener('click',()=>{const nav=$('#mobile-nav');nav.hidden=!nav.hidden;$('#menu-toggle').setAttribute('aria-expanded',String(!nav.hidden));});
  window.addEventListener('hashchange',()=>{if(location.hash.startsWith('#profile-record')||location.hash.startsWith('#combat-record')||location.hash.startsWith('#story-record')||location.hash.startsWith('#gallery-record'))return;render();});
  // Local section anchors inside a character profile use normal scrolling without rerendering.
  document.addEventListener('click',e=>{const a=e.target.closest('.detail-tabs a');if(a){e.preventDefault();const target=$(a.getAttribute('href'));target?.scrollIntoView({behavior:'smooth'});}});
  init();
})();
