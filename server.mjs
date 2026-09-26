import http from 'http'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { fileURLToPath } from 'url'
import { train, predict, evaluate, expandMultilingual } from './ml.mjs'

const __filename = fileURLToPath(import.meta.url)
const ROOT = path.dirname(__filename)
const PUBLIC = path.join(ROOT, 'public')
const BUNDLED_DATA = path.join(ROOT, 'data')
const DATA = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : BUNDLED_DATA
const UPLOADS = path.join(DATA, 'uploads')
const LEGACY_DB = path.join(DATA, 'db.json')
const SQLITE_DB = path.join(DATA, 'jharkhandi.sqlite')
const TRAINING = path.join(BUNDLED_DATA, 'training_sih2026.json')
const INSTITUTIONS = path.join(BUNDLED_DATA, 'institutions_official.json')
const PORT = Number(process.env.PORT || 5855)

fs.mkdirSync(PUBLIC,{recursive:true}); fs.mkdirSync(DATA,{recursive:true}); fs.mkdirSync(UPLOADS,{recursive:true})

const emptyState = {profiles:[],profileData:{},challenges:[],notifications:[],activity:[],settings:{language:'English',highContrast:false,lowBandwidth:false}}
let storageMode='json-fallback', db=null
try{
  const { DatabaseSync } = await import('node:sqlite')
  db = new DatabaseSync(SQLITE_DB)
  db.exec(`
    PRAGMA journal_mode=WAL;
    PRAGMA synchronous=NORMAL;
    CREATE TABLE IF NOT EXISTS app_state (id INTEGER PRIMARY KEY CHECK(id=1), json TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS ml_feedback (id INTEGER PRIMARY KEY AUTOINCREMENT, text TEXT NOT NULL, label TEXT NOT NULL, actor TEXT, challenge_id TEXT, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS uploads (id TEXT PRIMARY KEY, original_name TEXT, stored_name TEXT, mime TEXT, size INTEGER, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS server_audit (id INTEGER PRIMARY KEY AUTOINCREMENT, action TEXT NOT NULL, path TEXT NOT NULL, ip TEXT, detail TEXT, created_at TEXT NOT NULL);
  `)
  const existing=db.prepare('SELECT json FROM app_state WHERE id=1').get()
  if(!existing){
    let seed=emptyState
    if(fs.existsSync(LEGACY_DB)){try{seed={...emptyState,...JSON.parse(fs.readFileSync(LEGACY_DB,'utf8'))}}catch{}}
    db.prepare('INSERT INTO app_state(id,json,updated_at) VALUES(1,?,?)').run(JSON.stringify(seed),new Date().toISOString())
  }
  storageMode='sqlite'
}catch(err){
  console.warn('SQLite unavailable; using atomic JSON persistence.',err?.message||err)
  if(!fs.existsSync(LEGACY_DB)) fs.writeFileSync(LEGACY_DB,JSON.stringify(emptyState,null,2))
}

const baseTraining = JSON.parse(fs.readFileSync(TRAINING,'utf8'))
const officialInstitutions = JSON.parse(fs.readFileSync(INSTITUTIONS,'utf8'))
let mlModel=null, mlMetrics=null, mlFeedbackCount=0
const RULES={
 'Education':['school','student','teacher','education','learning','pedagogy','training','skill','vocational','college','university','curriculum','classroom','academic'],
 'Healthcare':['health','medical','hospital','patient','doctor','diagnostic','disease','maternal','clinical','medicine','telemedicine','wellness','rehabilitation','trauma'],
 'Agriculture':['agri','agriculture','crop','farmer','farming','soil','irrigation','pest','livestock','horticulture','mandi','seed','fertilizer','harvest','vegetable'],
 'Water Resources':['water','groundwater','river','drinking','watershed','flood','aquifer','reservoir','rainwater','hydrology','monsoon'],
 'Sanitation':['waste','sanitation','sewage','garbage','toilet','drainage','solid waste','wastewater','cleanliness','swachh'],
 'Environment':['environment','pollution','forest','climate','air quality','biodiversity','wildlife','carbon','ecology','emission','coastal','ocean','marine','hazard'],
 'Energy':['energy','electricity','solar','power','grid','renewable','battery','charging','electric','fuel','wind'],
 'Urban Development':['urban','city','traffic','road','transport','mobility','housing','parking','infrastructure','construction','property','ulpin'],
 'Accessibility':['accessibility','assistive','disabled','disability','blind','deaf','inclusive','sign language','remote community','remote communities'],
 'Public Administration':['government','governance','public service','grievance','citizen service','certificate','scheme','police','administration','municipal','department','compliance','complainant'],
 'Rural Livelihoods':['rural','livelihood','shg','self help','artisan','tribal','village','employment','entrepreneur','craft','market linkage','women empowerment','cooperative']
}
function readFeedback(){
  if(!db)return[]
  return db.prepare('SELECT id,text,label,actor,challenge_id AS challengeId,created_at AS createdAt FROM ml_feedback ORDER BY id').all()
}
function rebuildModel(){
  const feedback=readFeedback(); mlFeedbackCount=feedback.length
  const examples=[...(baseTraining.examples||[]),...feedback.map((x,i)=>({id:`feedback_${x.id||i}`,domain:x.label,text:x.text}))]
  mlModel=train(examples); mlMetrics=evaluate(baseTraining.examples||[])
}
rebuildModel()
function ruleScores(text=''){
  const low=expandMultilingual(text).toLowerCase(),scores={}
  for(const label of mlModel.labels){
    let s=0
    for(const k of (RULES[label]||[])) if(low.includes(k)) s += k.includes(' ')?2.2:1
    scores[label]=s
  }
  return scores
}
function hybridPredict(text='',chosen=''){
  if(chosen && chosen!=='Auto-detect' && mlModel.labels.includes(chosen))return {domain:chosen,confidence:1,top:[{domain:chosen,confidence:1}],source:'reviewer-selected',trainingExamples:mlModel.docCount,feedbackExamples:mlFeedbackCount}
  const nb=predict(mlModel,text), rules=ruleScores(text), maxRule=Math.max(0,...Object.values(rules))
  const map={}
  for(const label of mlModel.labels){
    const p=nb.top.find(x=>x.domain===label)?.confidence ?? 0
    const rule=maxRule?rules[label]/maxRule:0
    map[label]=.74*p + .26*rule
  }
  // Preserve probability mass outside NB top-3 by using a tiny prior.
  for(const label of mlModel.labels) if(!map[label]) map[label]=.001
  const ranked=Object.entries(map).sort((a,b)=>b[1]-a[1])
  const z=ranked.reduce((a,x)=>a+x[1],0)||1
  const top=ranked.slice(0,3).map(([domain,s])=>({domain,confidence:s/z}))
  return {domain:top[0]?.domain||'Public Administration',confidence:top[0]?.confidence||0,top,source:'trained-sih2026+controlled-taxonomy',trainingExamples:mlModel.docCount,feedbackExamples:mlFeedbackCount}
}

function cloneEmpty(){return JSON.parse(JSON.stringify(emptyState))}
function readState(){
  try{
    const raw=db?db.prepare('SELECT json FROM app_state WHERE id=1').get()?.json:fs.readFileSync(LEGACY_DB,'utf8')
    const x=JSON.parse(raw||'{}'); return {...cloneEmpty(),...x,settings:{...emptyState.settings,...(x.settings||{})}}
  }catch{return cloneEmpty()}
}
function writeState(s){
  if(db){db.prepare('UPDATE app_state SET json=?,updated_at=? WHERE id=1').run(JSON.stringify(s),new Date().toISOString());return}
  const tmp=LEGACY_DB+'.tmp';fs.writeFileSync(tmp,JSON.stringify(s,null,2));fs.renameSync(tmp,LEGACY_DB)
}

const clients=new Set()
function headers(extra={}){return {'X-Content-Type-Options':'nosniff','X-Frame-Options':'SAMEORIGIN','Referrer-Policy':'strict-origin-when-cross-origin','Permissions-Policy':'camera=(), microphone=(), geolocation=(self)','Cross-Origin-Resource-Policy':'same-origin','Content-Security-Policy':"default-src 'self'; base-uri 'self'; form-action 'self'; object-src 'none'; img-src 'self' data: https://*.openstreetmap.org https://tile.openstreetmap.org; media-src 'self'; connect-src 'self' https://nominatim.openstreetmap.org https://api.open-meteo.com; style-src 'self' 'unsafe-inline'; script-src 'self'; frame-src https://www.openstreetmap.org",...extra}}
function sendJson(res,status,obj){const body=JSON.stringify(obj);res.writeHead(status,headers({'Content-Type':'application/json; charset=utf-8','Content-Length':Buffer.byteLength(body),'Cache-Control':'no-store'}));res.end(body)}
function parseBody(req,limit=18*1024*1024){return new Promise((resolve,reject)=>{let total=0,chunks=[];req.on('data',c=>{total+=c.length;if(total>limit){reject(new Error('Payload too large'));req.destroy();return}chunks.push(c)});req.on('end',()=>resolve(Buffer.concat(chunks).toString('utf8')));req.on('error',reject)})}
function mutationGuard(req,res){
  const type=String(req.headers['content-type']||'').toLowerCase()
  if(!type.startsWith('application/json')){sendJson(res,415,{error:'Content-Type application/json is required'});return false}
  const origin=String(req.headers.origin||'').trim()
  if(origin){
    try{if(new URL(origin).host!==String(req.headers.host||'')){sendJson(res,403,{error:'Cross-origin write request rejected'});return false}}
    catch{sendJson(res,403,{error:'Invalid request origin'});return false}
  }
  return true
}
function broadcast(state,source='server'){const payload=`data: ${JSON.stringify({state,source,serverTime:new Date().toISOString()})}\n\n`;for(const res of clients){try{res.write(payload)}catch{clients.delete(res)}}}
const rateBuckets=new Map()
function requestIp(req){return String(req.socket?.remoteAddress||'local').slice(0,120)}
function rateLimit(req,res,key,limit=90,windowMs=60_000){const bucketKey=`${requestIp(req)}:${key}`,t=Date.now(),prev=rateBuckets.get(bucketKey)||[];const recent=prev.filter(x=>t-x<windowMs);if(recent.length>=limit){sendJson(res,429,{error:'Too many requests. Please wait and retry.'});return false}recent.push(t);rateBuckets.set(bucketKey,recent);return true}
function auditServer(req,action,detail=''){if(!db)return;try{db.prepare('INSERT INTO server_audit(action,path,ip,detail,created_at) VALUES(?,?,?,?,?)').run(action,String(req.url||''),requestIp(req),String(detail||'').slice(0,1000),new Date().toISOString())}catch{}}
function safeOriginalName(name='file'){return path.basename(String(name)).replace(/[\x00-\x1f\x7f]/g,'').slice(0,180)||'file'}
function safeFileName(name='file'){const ext=path.extname(name).slice(0,12).replace(/[^.a-zA-Z0-9]/g,'');return `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`}
const allowedMime=new Set(['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','application/pdf','text/plain','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
const mimeExt={ 'image/jpeg':['.jpg','.jpeg'], 'image/png':['.png'], 'image/webp':['.webp'], 'image/gif':['.gif'], 'video/mp4':['.mp4'], 'video/webm':['.webm'], 'application/pdf':['.pdf'], 'text/plain':['.txt'], 'application/msword':['.doc'], 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':['.docx'] }
function uploadLooksValid(name,mime,buf){const ext=path.extname(name).toLowerCase();if(!allowedMime.has(mime)||!(mimeExt[mime]||[]).includes(ext)||!buf?.length)return false;if(mime==='application/pdf'&&buf.slice(0,5).toString()!=='%PDF-')return false;if(mime==='image/png'&&buf.slice(1,4).toString()!=='PNG')return false;if(mime==='image/jpeg'&&!(buf[0]===0xff&&buf[1]===0xd8))return false;return true}
const mimeMap={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.webmanifest':'application/manifest+json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.ico':'image/x-icon','.mp4':'video/mp4','.webm':'video/webm'}
function serveFile(res,file){if(!fs.existsSync(file)||!fs.statSync(file).isFile())return false;const ext=path.extname(file),data=fs.readFileSync(file);res.writeHead(200,headers({'Content-Type':mimeMap[ext]||'application/octet-stream','Content-Length':data.length,'Cache-Control':ext==='.html'?'no-cache':'public, max-age=300'}));res.end(data);return true}
async function liveContext(lat,lon){
  const out={latitude:Number(lat),longitude:Number(lon),retrievedAt:new Date().toISOString(),live:false}
  if(!Number.isFinite(out.latitude)||!Number.isFinite(out.longitude))return out
  const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),5500)
  try{
    const [geo,weather]=await Promise.allSettled([
      fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&zoom=14`,{headers:{'User-Agent':'Jharkhandi/1.0 (societal innovation platform)'},signal:ctrl.signal}).then(r=>r.ok?r.json():null),
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}&current=temperature_2m,precipitation,weather_code&timezone=auto`,{signal:ctrl.signal}).then(r=>r.ok?r.json():null)
    ])
    if(geo.status==='fulfilled'&&geo.value){out.address=geo.value.display_name;out.locality=geo.value.address||{};out.live=true}
    if(weather.status==='fulfilled'&&weather.value?.current){out.weather=weather.value.current;out.weatherUnits=weather.value.current_units;out.live=true}
  }catch{}finally{clearTimeout(timer)}
  return out
}

const server=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,`http://${req.headers.host||'localhost'}`)
  if(url.pathname==='/api/health'&&req.method==='GET')return sendJson(res,200,{ok:true,service:'Jharkhandi Production API',storage:storageMode,liveSync:'SSE',security:{sameOriginWrites:true,uploadValidation:'mime+extension+basic-signature',rateLimit:true,authentication:'prototype-role-entry-not-production-auth'},model:{kind:mlModel.kind,trainingExamples:mlModel.docCount,reviewerCorrections:mlFeedbackCount},serverTime:new Date().toISOString()})
  if(url.pathname==='/api/state'&&req.method==='GET')return sendJson(res,200,{state:readState(),serverTime:new Date().toISOString(),storage:storageMode})
  if(url.pathname==='/api/state'&&req.method==='PUT'){
    if(!rateLimit(req,res,'state-write',60))return
    if(!mutationGuard(req,res))return
    const raw=await parseBody(req,10*1024*1024),body=JSON.parse(raw||'{}'),s=body.state
    if(!s||!Array.isArray(s.challenges)||!Array.isArray(s.activity)||!Array.isArray(s.profiles))return sendJson(res,400,{error:'Invalid state payload'})
    writeState(s);auditServer(req,'state-write',body.source||'client');broadcast(s,body.source||'client');return sendJson(res,200,{ok:true,storage:storageMode,serverTime:new Date().toISOString()})
  }
  if(url.pathname==='/api/ml/info'&&req.method==='GET')return sendJson(res,200,{model:{kind:mlModel.kind,trainingExamples:mlModel.docCount,baseExamples:(baseTraining.examples||[]).length,reviewerCorrections:mlFeedbackCount,taxonomy:baseTraining.taxonomy,source:baseTraining.source,seedHoldout:{accuracy:mlMetrics.accuracy,correct:mlMetrics.correct,total:mlMetrics.total},humanReview:true}})
  if(url.pathname==='/api/ml/classify'&&req.method==='POST'){
    if(!rateLimit(req,res,'classify',120))return
    if(!mutationGuard(req,res))return
    const raw=await parseBody(req,256*1024),body=JSON.parse(raw||'{}'),text=String(body.text||'').trim();if(!text)return sendJson(res,400,{error:'Text is required'})
    return sendJson(res,200,{prediction:hybridPredict(text,String(body.chosen||''))})
  }
  if(url.pathname==='/api/ml/feedback'&&req.method==='POST'){
    if(!rateLimit(req,res,'ml-feedback',40))return
    if(!mutationGuard(req,res))return
    const raw=await parseBody(req,256*1024),body=JSON.parse(raw||'{}'),text=String(body.text||'').trim(),label=String(body.label||'').trim();if(!text||!mlModel.labels.includes(label))return sendJson(res,400,{error:'Valid text and taxonomy label are required'})
    if(db)db.prepare('INSERT INTO ml_feedback(text,label,actor,challenge_id,created_at) VALUES(?,?,?,?,?)').run(text,label,String(body.actor||''),String(body.challengeId||''),new Date().toISOString())
    else {const fp=path.join(DATA,'ml-feedback.json');let arr=[];try{arr=JSON.parse(fs.readFileSync(fp,'utf8'))}catch{};arr.push({text,label,actor:body.actor||'',challengeId:body.challengeId||'',createdAt:new Date().toISOString()});fs.writeFileSync(fp,JSON.stringify(arr,null,2))}
    rebuildModel();auditServer(req,'ml-feedback',label);return sendJson(res,200,{ok:true,model:{trainingExamples:mlModel.docCount,reviewerCorrections:mlFeedbackCount}})
  }
  if(url.pathname==='/api/integrations'&&req.method==='GET')return sendJson(res,200,{integrations:[{name:'OpenStreetMap',status:'LIVE',purpose:'Map rendering'},{name:'Nominatim',status:'OPTIONAL',purpose:'Reverse geocoding when internet is available'},{name:'Open-Meteo',status:'OPTIONAL',purpose:'Live environmental context when internet is available'},{name:'Local trained classifier',status:'LIVE',purpose:'Domain classification with reviewer correction'},{name:'Government SSO / Aadhaar / DigiLocker',status:'NOT IMPLEMENTED',purpose:'Production identity integration'},{name:'SMS / Email',status:'NOT IMPLEMENTED',purpose:'Production outbound notifications'},{name:'Cloud object storage',status:'NOT IMPLEMENTED',purpose:'Production evidence storage'}]})
  if(url.pathname==='/api/institutions'&&req.method==='GET')return sendJson(res,200,{institutions:officialInstitutions.institutions||officialInstitutions,sources:officialInstitutions.sources||[],snapshot:officialInstitutions.snapshot||null,note:officialInstitutions.note||''})
  if(url.pathname==='/api/context'&&req.method==='GET')return sendJson(res,200,{context:await liveContext(Number(url.searchParams.get('lat')),Number(url.searchParams.get('lon')))})
  if(url.pathname==='/api/upload'&&req.method==='POST'){
    if(!rateLimit(req,res,'upload',30))return
    if(!mutationGuard(req,res))return
    const raw=await parseBody(req,16*1024*1024),body=JSON.parse(raw||'{}'),files=Array.isArray(body.files)?body.files.slice(0,8):[],out=[]
    for(const f of files){if(!f||!f.name||!f.data||!allowedMime.has(f.type||''))continue;const original=safeOriginalName(f.name),m=String(f.data).match(/^data:([^;]+);base64,(.+)$/);if(!m||m[1]!==f.type)continue;const buf=Buffer.from(m[2],'base64');if(buf.length>10*1024*1024||!uploadLooksValid(original,f.type,buf))continue;const stored=safeFileName(original),id=`ev_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`;fs.writeFileSync(path.join(UPLOADS,stored),buf,{mode:0o600});if(db)db.prepare('INSERT INTO uploads(id,original_name,stored_name,mime,size,created_at) VALUES(?,?,?,?,?,?)').run(id,original,stored,f.type,buf.length,new Date().toISOString());out.push({id,name:original,type:f.type,size:buf.length,addedAt:new Date().toISOString(),url:`/uploads/${encodeURIComponent(stored)}`})}
    auditServer(req,'upload',`accepted=${out.length};submitted=${files.length}`);return sendJson(res,200,{files:out})
  }
  if(url.pathname==='/api/events'&&req.method==='GET'){res.writeHead(200,headers({'Content-Type':'text/event-stream','Connection':'keep-alive','Cache-Control':'no-cache'}));res.write(`data: ${JSON.stringify({state:readState(),source:'server:init',serverTime:new Date().toISOString()})}\n\n`);clients.add(res);const ping=setInterval(()=>{try{res.write(`: ping ${Date.now()}\n\n`)}catch{}},20000);req.on('close',()=>{clearInterval(ping);clients.delete(res)});return}
  if(url.pathname.startsWith('/uploads/')){const base=path.basename(decodeURIComponent(url.pathname.slice('/uploads/'.length)));return serveFile(res,path.join(UPLOADS,base))||sendJson(res,404,{error:'Not found'})}
  let rel=decodeURIComponent(url.pathname);if(rel==='/'||rel==='')rel='/index.html';const file=path.normalize(path.join(PUBLIC,rel));if(!file.startsWith(PUBLIC))return sendJson(res,403,{error:'Forbidden'});if(serveFile(res,file))return;return serveFile(res,path.join(PUBLIC,'index.html'))||sendJson(res,404,{error:'index.html missing'})
 }catch(err){console.error(err);if(!res.headersSent)sendJson(res,500,{error:err?.message||'Server error'});else res.end()}
})
server.listen(PORT,'0.0.0.0',()=>console.log(`Jharkhandi Production running on http://localhost:${PORT} (${storageMode})`))
