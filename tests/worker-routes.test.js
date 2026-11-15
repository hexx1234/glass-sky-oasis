import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import worker from '../src/worker.js';
const starter=JSON.parse(readFileSync(new URL('../public/data/site.json',import.meta.url),'utf8'));
const origin='https://gso.example';
const env={GITHUB_OWNER:'example',GITHUB_REPO:'gso',GITHUB_BRANCH:'main',GITHUB_TOKEN:'token-local-test',ADMIN_PASSWORD:'test-only-very-long-password-not-for-production',SESSION_SECRET:'test-secret-1234567890123456789012345678',ASSETS:{fetch:async()=>new Response(JSON.stringify(starter),{headers:{'content-type':'application/json'}})}};
const uri=(path)=>new Request(origin+path);
const post=(path,body,cookie='')=>new Request(origin+path,{method:'POST',headers:{origin,'content-type':'application/json',...(cookie?{cookie}:{})},body:JSON.stringify(body)});
const put=(path,body,cookie='')=>new Request(origin+path,{method:'PUT',headers:{origin,'content-type':'application/json',...(cookie?{cookie}:{})},body:JSON.stringify(body)});
test('worker serves content, authorizes edit and saves to GitHub API without exposing token',async()=>{
  const originalFetch=globalThis.fetch;
  let sha='version-1',store=JSON.stringify(starter);
  const uploads=new Map();
  globalThis.fetch=async(request,opts={})=>{
    const url=String(request);
    assert.ok(url.startsWith('https://api.github.com/'));
    assert.equal(opts.headers.authorization,'Bearer token-local-test');
    if(opts.method==='PUT'){
      const path=decodeURIComponent(url.split('/contents/')[1]);
      const body=JSON.parse(opts.body);
      if(path==='public/data/site.json'){
        assert.equal(body.sha,sha);
        store=new TextDecoder().decode(Uint8Array.from(atob(body.content),c=>c.charCodeAt(0)));
        sha='version-2';
      }else uploads.set(path,body.content);
      return Response.json({content:{sha}});
    }
    const path=decodeURIComponent(new URL(url).pathname.split('/contents/')[1]);
    if(uploads.has(path))return new Response(Uint8Array.from(atob(uploads.get(path)),c=>c.charCodeAt(0)),{headers:{'content-type':'application/octet-stream'}});
    return Response.json({sha,content:btoa(String.fromCharCode(...new TextEncoder().encode(store)))});
  };
  try{
    const initial=await (await worker.fetch(uri('/api/data'),env)).json();
    assert.equal(initial.sha,'version-1');
    assert.equal((await worker.fetch(uri('/api/session'),env)).status,200);
    assert.equal((await worker.fetch(post('/api/login',{password:'wrong'}),env)).status,401);
    const login=await worker.fetch(post('/api/login',{password:env.ADMIN_PASSWORD}),env);
    assert.equal(login.status,200);
    const cookie=login.headers.get('set-cookie').split(';')[0];
    assert.ok(cookie.startsWith('gso_admin='));
    const next=structuredClone(starter);next.settings.heroTitle='Updated title';
    assert.equal((await worker.fetch(put('/api/data',{data:next,sha:'version-1'}),env)).status,401);
    const saved=await worker.fetch(put('/api/data',{data:next,sha:'version-1'},cookie),env);
    assert.equal(saved.status,200);
    const after=await (await worker.fetch(uri('/api/data'),env)).json();
    assert.equal(after.data.settings.heroTitle,'Updated title');
    assert.equal((await worker.fetch(put('/api/data',{data:next,sha:'version-1'},cookie),env)).status,409);
    const image=Uint8Array.from([137,80,78,71,13,10,26,10,0]);
    const upload=await (await worker.fetch(post('/api/upload',{name:'portrait.png',mimeType:'image/png',base64:btoa(String.fromCharCode(...image))},cookie),env)).json();
    assert.ok(upload.path.startsWith('uploads/'));
    const imageResponse=await worker.fetch(uri('/api/media/'+upload.path.split('/')[1]),env);
    assert.equal(imageResponse.status,200);
    assert.deepEqual(new Uint8Array(await imageResponse.arrayBuffer()),image);
  }finally{globalThis.fetch=originalFetch;}
});
