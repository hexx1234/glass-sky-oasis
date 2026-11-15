import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const site=JSON.parse(readFileSync(new URL('../public/data/site.json',import.meta.url),'utf8'));
async function render(route){
  const nodes=new Map();
  const stub={addEventListener(){},setAttribute(){},classList:{toggle(){}},style:{},hidden:false};
  const main={innerHTML:'',addEventListener(){},insertAdjacentHTML(){}};
  nodes.set('#app',main);
  nodes.set('#menu-toggle',{...stub});
  nodes.set('#mobile-nav',{...stub});
  for(const s of ['#participant-search','#species-filter','#art-cards','#directory-cards'])nodes.set(s,{...stub,value:'',innerHTML:''});
  const document={querySelector:s=>nodes.get(s)||null,querySelectorAll:()=>[],addEventListener(){}};
  const window={GSO_PREVIEW_DATA:site,addEventListener(){},scrollTo(){}};
  vm.runInNewContext(source,{window,document,location:{hash:'#'+route},console,decodeURIComponent,encodeURIComponent,Set});
  await new Promise(resolve=>setTimeout(resolve,2));
  return main.innerHTML;
}
test('homepage follows approved order and omits ABOUT GSO as a separate navigation page',async()=>{
  const html=await render('home');
  const sequence=['ABOUT GSO','OUR BUSINESS','BUBBLE ZONE','PARTICIPANTS','NEWS &amp; MEDIA'];
  let last=-1;
  for(const marker of sequence){const idx=html.indexOf(marker,last+1);assert.ok(idx>last,`Missing ordered ${marker}`);last=idx;}
  assert.ok(html.includes('CIEL')&&html.includes('ELGAR')&&html.includes('ALIN'));
});
test('world page includes real species and bubble ranking history',async()=>{
  const html=await render('world');
  for(const name of ['리프테일','에퀴아','에어로닐','버블 랭킹 시스템']) assert.ok(html.includes(name));
});
test('business page has no infrastructure section',async()=>{
  const html=await render('business');
  for(const name of ['Bubble Energy','Citizen Service','Media &amp; Broadcast']) assert.ok(html.includes(name));
  assert.ok(!html.includes('Infrastructure'));
});
test('character profile includes skills and has archive tab',async()=>{
  const html=await render('person/ciel');
  assert.ok(html.includes('워터 슬라이스')&&html.includes('아쿠아 테더')&&html.includes('ARTWORK'));
});
test('archive has category filters',async()=>{
  const html=await render('archive');
  assert.ok(html.includes('COMMISSION')&&html.includes('FAN ART'));
});
