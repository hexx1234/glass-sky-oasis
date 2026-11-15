/**
 * GSO API. Public content lives in GitHub, credentials only in Worker secrets.
 * This file is server-side only; never copy GITHUB_TOKEN into public/.
 */
const DATA_FILE = 'public/data/site.json';
const ALLOWED_MIME = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif'
};
const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer'
};

const json = (data, status = 200, moreHeaders = {}) => new Response(JSON.stringify(data), {status, headers:{...JSON_HEADERS,...moreHeaders}});
const fail = (message, status = 400) => json({error:message},status);
const bytesToBase64 = (bytes) => {
  let binary = '';
  for (let i=0; i<bytes.length; i+=8192) binary += String.fromCharCode(...bytes.subarray(i,i+8192));
  return btoa(binary);
};
const base64ToBytes = (value) => {
  const raw = atob(value.replace(/\s/g,''));
  const out = new Uint8Array(raw.length);
  for (let i=0;i<raw.length;i++) out[i]=raw.charCodeAt(i);
  return out;
};
const base64url = (bytes) => bytesToBase64(bytes).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const safeEqual = (a,b) => {
  const x=new TextEncoder().encode(String(a)), y=new TextEncoder().encode(String(b));
  let diff=x.length ^ y.length;
  for (let i=0;i<Math.max(x.length,y.length);i++) diff|=(x[i%x.length]||0) ^ (y[i%y.length]||0);
  return diff===0;
};
const configured = (env) => !!(env.GITHUB_OWNER && env.GITHUB_REPO && env.GITHUB_TOKEN);
const adminConfigured = (env) => configured(env) && !!(env.ADMIN_PASSWORD && env.SESSION_SECRET);
const ghUrl = (env,path) => {
  const safePath=path.split('/').map(encodeURIComponent).join('/');
  return `https://api.github.com/repos/${encodeURIComponent(env.GITHUB_OWNER)}/${encodeURIComponent(env.GITHUB_REPO)}/contents/${safePath}`;
};
const ghHeaders = (env) => ({
  accept:'application/vnd.github+json',
  authorization:`Bearer ${env.GITHUB_TOKEN}`,
  'X-GitHub-Api-Version':'2022-11-28',
  'User-Agent':'glass-sky-oasis-worker'
});
async function getGhFile(env,path){
  const u=new URL(ghUrl(env,path));
  u.searchParams.set('ref', env.GITHUB_BRANCH || 'main');
  const res=await fetch(u,{headers:ghHeaders(env)});
  if (res.status===404) return null;
  if(!res.ok) throw new Error(`GitHub read failed (${res.status})`);
  return await res.json();
}
async function putGhFile(env,path,base64,sha,message){
  const body={message,content:base64,branch:env.GITHUB_BRANCH||'main'};
  if(sha)body.sha=sha;
  const res=await fetch(ghUrl(env,path),{method:'PUT',headers:{...ghHeaders(env),'content-type':'application/json'},body:JSON.stringify(body)});
  if(res.status===409||res.status===422)throw Object.assign(new Error('GitHub update conflict. Refresh and try again.'),{status:409});
  if(!res.ok)throw new Error(`GitHub save failed (${res.status})`);
  return await res.json();
}
async function hmac(env,message){
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(env.SESSION_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  return base64url(new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(message))));
}
function cookieFrom(request){
  const cookies=request.headers.get('cookie')||'';
  const hit=cookies.match(/(?:^|;\s*)gso_admin=([^;]+)/);
  return hit ? decodeURIComponent(hit[1]) : '';
}
async function isAdmin(request,env){
  if(!adminConfigured(env))return false;
  const token=cookieFrom(request);
  const parts=token.split('.');
  if(parts.length!==3)return false;
  const [expires,nonce,sig]=parts;
  if(!/^\d{10,13}$/.test(expires) || !/^[\w-]{10,}$/.test(nonce) || Number(expires)<Date.now())return false;
  const valid=await hmac(env,`${expires}.${nonce}`);
  return safeEqual(valid,sig);
}
async function makeCookie(env,request){
  const expires=Date.now()+12*60*60*1000;
  const nonce=base64url(crypto.getRandomValues(new Uint8Array(16)));
  const sig=await hmac(env,`${expires}.${nonce}`);
  const secure=new URL(request.url).protocol==='https:' ? '; Secure' : '';
  return `gso_admin=${expires}.${nonce}.${sig}; Path=/api; HttpOnly; SameSite=Strict; Max-Age=43200${secure}`;
}
function originOK(req){
  const origin=req.headers.get('origin');
  return !origin || origin===new URL(req.url).origin;
}
async function parseJson(req){
  const size=Number(req.headers.get('content-length')||0);
  if(size>14*1024*1024)throw Object.assign(new Error('Request too large'),{status:413});
  if(!(req.headers.get('content-type')||'').includes('application/json'))throw Object.assign(new Error('JSON required'),{status:415});
  return await req.json();
}
function validateData(data){
  if(!data || typeof data!=='object'||Array.isArray(data))return false;
  if(!data.settings || typeof data.settings!=='object')return false;
  if(!Array.isArray(data.characters)||!Array.isArray(data.artworks)||!Array.isArray(data.news)||!Array.isArray(data.species))return false;
  if(data.characters.length>500||data.artworks.length>3000||data.news.length>2000)return false;
  if(!data.characters.every(x=>x && typeof x.id==='string'&&typeof x.name==='string'))return false;
  return true;
}
function sniffImage(bytes,mime){
  if(mime==='image/png')return bytes.length>8 && [137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v);
  if(mime==='image/jpeg')return bytes.length>3 && bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
  if(mime==='image/gif')return bytes.length>6 && String.fromCharCode(...bytes.slice(0,6)).match(/^GIF8[79]a$/);
  if(mime==='image/webp')return bytes.length>12 && String.fromCharCode(...bytes.slice(0,4))==='RIFF' && String.fromCharCode(...bytes.slice(8,12))==='WEBP';
  return false;
}
function errorReply(e){
  const status=e.status||500;
  return fail(status===500?'서버에서 작업을 처리하지 못했습니다. 설정을 확인해 주세요.':e.message,status);
}
export default {
  async fetch(request,env){
    const url=new URL(request.url);
    const p=url.pathname;
    if(!p.startsWith('/api/')) return env.ASSETS.fetch(request);
    try{
      if(p==='/api/session' && request.method==='GET')
        return json({configured:adminConfigured(env),authenticated:await isAdmin(request,env)});

      if(p==='/api/data' && request.method==='GET'){
        if(configured(env)){
          const file=await getGhFile(env,DATA_FILE);
          if(file?.content){
            const data=JSON.parse(new TextDecoder().decode(base64ToBytes(file.content)));
            return json({data,sha:file.sha,source:'github'});
          }
        }
        const local=await env.ASSETS.fetch(new Request(new URL('/data/site.json',url)));
        if(!local.ok)return fail('Starter data was not found',500);
        return json({data:await local.json(),sha:null,source:'starter'});
      }

      if(p.startsWith('/api/media/') && request.method==='GET'){
        const name=decodeURIComponent(p.slice('/api/media/'.length));
        if(!/^[A-Za-z0-9._-]{1,150}$/.test(name))return fail('Invalid file name');
        if(!configured(env))return fail('Media storage not configured',404);
        // Raw media representation handles GitHub files >1 MB, where JSON content can be empty.
        const rawUrl=new URL(ghUrl(env,`public/uploads/${name}`));
        rawUrl.searchParams.set('ref',env.GITHUB_BRANCH||'main');
        const raw=await fetch(rawUrl,{headers:{...ghHeaders(env),accept:'application/vnd.github.raw+json'}});
        if(raw.status===404)return fail('Image not found',404);
        if(!raw.ok)throw new Error(`GitHub media read failed (${raw.status})`);
        let bytes;
        if((raw.headers.get('content-type')||'').includes('json')){
          const file=await raw.json();
          if(file.content){bytes=base64ToBytes(file.content);}
          else if(file.sha){
            const blobUrl=`https://api.github.com/repos/${encodeURIComponent(env.GITHUB_OWNER)}/${encodeURIComponent(env.GITHUB_REPO)}/git/blobs/${encodeURIComponent(file.sha)}`;
            const blob=await fetch(blobUrl,{headers:ghHeaders(env)});
            if(!blob.ok)throw new Error(`GitHub blob read failed (${blob.status})`);
            const payload=await blob.json();
            if(payload.encoding!=='base64'||!payload.content)return fail('Image data unavailable',502);
            bytes=base64ToBytes(payload.content);
          }else return fail('Image data unavailable',502);
        }else bytes=new Uint8Array(await raw.arrayBuffer());
        const ext=name.split('.').pop().toLowerCase();
        const mime=ext==='png'?'image/png':ext==='webp'?'image/webp':ext==='gif'?'image/gif':'image/jpeg';
        return new Response(bytes,{headers:{'content-type':mime,'cache-control':'public, max-age=60','x-content-type-options':'nosniff'}});
      }

      if(request.method!=='POST' && request.method!=='PUT')return fail('Not found',404);
      if(!originOK(request))return fail('Origin not allowed',403);
      if(!p.startsWith('/api/media/') && !adminConfigured(env))return fail('GitHub and admin secrets are not configured',503);

      if(p==='/api/login' && request.method==='POST'){
        const body=await parseJson(request);
        if(typeof body.password!=='string'||!safeEqual(body.password,env.ADMIN_PASSWORD))return fail('비밀번호가 올바르지 않습니다.',401);
        return json({ok:true},200,{'set-cookie':await makeCookie(env,request)});
      }
      if(p==='/api/logout' && request.method==='POST')
        return json({ok:true},200,{'set-cookie':'gso_admin=; Path=/api; HttpOnly; SameSite=Strict; Max-Age=0'});

      if(!(await isAdmin(request,env)))return fail('관리자 로그인이 필요합니다.',401);

      if(p==='/api/data' && request.method==='PUT'){
        const body=await parseJson(request);
        if(!validateData(body.data))return fail('잘못된 데이터 형식입니다.');
        const text=JSON.stringify(body.data,null,2)+'\n';
        if(new TextEncoder().encode(text).length>2*1024*1024)return fail('데이터가 너무 큽니다.',413);
        const current=await getGhFile(env,DATA_FILE);
        if(current?.sha && body.sha!==current.sha)return fail('다른 곳에서 내용이 변경됐습니다. 새로고침 후 다시 시도하세요.',409);
        const updated=await putGhFile(env,DATA_FILE,bytesToBase64(new TextEncoder().encode(text)),current?.sha,'Update GSO archive content');
        return json({ok:true,sha:updated.content?.sha});
      }

      if(p==='/api/upload' && request.method==='POST'){
        const body=await parseJson(request);
        if(typeof body.base64!=='string'||!ALLOWED_MIME[body.mimeType])return fail('JPG, PNG, WEBP, GIF 이미지만 등록할 수 있습니다.');
        if(body.base64.length>11.3*1024*1024)return fail('이미지는 8MB 이하로 업로드해 주세요.',413);
        let bytes;try{bytes=base64ToBytes(body.base64);}catch{return fail('이미지 데이터가 올바르지 않습니다.');}
        if(bytes.length>8*1024*1024)return fail('이미지는 8MB 이하로 업로드해 주세요.',413);
        if(!sniffImage(bytes,body.mimeType))return fail('파일 형식이 일치하지 않습니다.');
        const safe=String(body.name||'image').replace(/\.[^.]+$/,'').replace(/[^a-zA-Z0-9_-]/g,'-').slice(0,40)||'image';
        const suffix=Array.from(crypto.getRandomValues(new Uint8Array(5))).map(x=>x.toString(16).padStart(2,'0')).join('');
        const filename=`${Date.now().toString(36)}-${suffix}-${safe}.${ALLOWED_MIME[body.mimeType]}`;
        await putGhFile(env,`public/uploads/${filename}`,body.base64,null,`Upload GSO artwork: ${filename}`);
        return json({ok:true,path:`uploads/${filename}`});
      }
      return fail('Not found',404);
    }catch(error){return errorReply(error);}
  }
};

export {safeEqual,base64ToBytes,bytesToBase64,validateData,sniffImage};
