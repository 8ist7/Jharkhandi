#!/usr/bin/env python3
"""Standard-library fallback server for Jharkhandi.
Used only when Node.js 18+ is unavailable. No pip install is required.
"""
from __future__ import annotations
import base64, json, mimetypes, os, re, sqlite3, sys, threading, time, urllib.parse, uuid
from http import HTTPStatus
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PUBLIC = ROOT / "public"
DATA = Path(os.environ.get("DATA_DIR", ROOT / "data")).resolve()
UPLOADS = DATA / "uploads"
PORT = int(os.environ.get("PORT", "5855"))
DB = DATA / "jharkhandi.sqlite"
LEGACY = DATA / "db.json"
TRAINING = ROOT / "data" / "training_sih2026.json"
INSTITUTIONS = ROOT / "data" / "institutions_official.json"
DATA.mkdir(parents=True, exist_ok=True); UPLOADS.mkdir(parents=True, exist_ok=True)
EMPTY = {"profiles":[],"profileData":{},"challenges":[],"notifications":[],"activity":[],"settings":{"language":"English","highContrast":False,"lowBandwidth":False}}

_lock = threading.RLock()

def _db_conn():
    c = sqlite3.connect(DB, timeout=10)
    c.execute("PRAGMA journal_mode=WAL")
    c.execute("CREATE TABLE IF NOT EXISTS app_state (id INTEGER PRIMARY KEY CHECK(id=1), json TEXT NOT NULL, updated_at TEXT NOT NULL)")
    c.execute("CREATE TABLE IF NOT EXISTS ml_feedback (id INTEGER PRIMARY KEY AUTOINCREMENT, text TEXT NOT NULL, label TEXT NOT NULL, actor TEXT, challenge_id TEXT, created_at TEXT NOT NULL)")
    c.execute("CREATE TABLE IF NOT EXISTS uploads (id TEXT PRIMARY KEY, original_name TEXT, stored_name TEXT, mime TEXT, size INTEGER, created_at TEXT NOT NULL)")
    row=c.execute("SELECT json FROM app_state WHERE id=1").fetchone()
    if not row:
        seed=EMPTY
        try:
            if LEGACY.exists(): seed={**EMPTY, **json.loads(LEGACY.read_text(encoding='utf-8'))}
        except Exception: pass
        c.execute("INSERT INTO app_state(id,json,updated_at) VALUES(1,?,datetime('now'))", (json.dumps(seed),))
        c.commit()
    return c

def read_state():
    with _lock:
        try:
            c=_db_conn(); row=c.execute("SELECT json FROM app_state WHERE id=1").fetchone(); c.close()
            x=json.loads(row[0] if row else "{}")
            return {**EMPTY, **x, "settings":{**EMPTY["settings"], **x.get("settings",{})}}
        except Exception:
            try: return {**EMPTY, **json.loads(LEGACY.read_text(encoding='utf-8'))}
            except Exception: return json.loads(json.dumps(EMPTY))

def write_state(state):
    with _lock:
        try:
            c=_db_conn(); c.execute("UPDATE app_state SET json=?,updated_at=datetime('now') WHERE id=1",(json.dumps(state),)); c.commit(); c.close(); return
        except Exception:
            LEGACY.write_text(json.dumps(state,indent=2),encoding='utf-8')

training=json.loads(TRAINING.read_text(encoding='utf-8')) if TRAINING.exists() else {"examples":[],"taxonomy":[]}
institutions=json.loads(INSTITUTIONS.read_text(encoding='utf-8')) if INSTITUTIONS.exists() else {"institutions":[]}
RULES={
 'Education':['school','student','teacher','education','learning','training','skill','college','university','classroom'],
 'Healthcare':['health','medical','hospital','patient','doctor','disease','medicine','telemedicine'],
 'Agriculture':['agriculture','crop','farmer','farming','soil','irrigation','pest','livestock','seed','harvest'],
 'Water Resources':['water','groundwater','river','drinking','watershed','flood','aquifer','reservoir','rainwater','borewell'],
 'Sanitation':['waste','sanitation','sewage','garbage','toilet','drainage','wastewater'],
 'Environment':['environment','pollution','forest','climate','air quality','biodiversity','wildlife','carbon'],
 'Energy':['energy','electricity','solar','power','grid','renewable','battery','charging'],
 'Urban Development':['urban','city','traffic','road','transport','mobility','housing','parking','infrastructure'],
 'Accessibility':['accessibility','assistive','disabled','disability','blind','deaf','inclusive','sign language'],
 'Public Administration':['government','governance','public service','grievance','certificate','scheme','police','municipal'],
 'Rural Livelihoods':['rural','livelihood','shg','artisan','tribal','village','employment','entrepreneur','cooperative']
}
labels=sorted(set([e.get('domain','') for e in training.get('examples',[]) if e.get('domain')]) | set(RULES))

def classify(text, chosen=''):
    if chosen and chosen!='Auto-detect' and chosen in labels:
        return {"domain":chosen,"confidence":1.0,"top":[{"domain":chosen,"confidence":1.0}],"source":"reviewer-selected","trainingExamples":len(training.get('examples',[])),"feedbackExamples":0}
    low=str(text).lower(); scores={k:0.02 for k in labels}
    for label, words in RULES.items():
        for w in words:
            if w in low: scores[label]=scores.get(label,0.02)+(2.0 if ' ' in w else 1.0)
    # seed with simple corpus token overlap so the fallback still behaves sensibly
    toks=set(re.findall(r"[a-z0-9]+",low))
    for e in training.get('examples',[]):
        et=set(re.findall(r"[a-z0-9]+",str(e.get('text','')).lower()))
        overlap=len(toks & et)
        if overlap: scores[e.get('domain','Public Administration')]=scores.get(e.get('domain','Public Administration'),0.02)+0.08*overlap
    ranked=sorted(scores.items(), key=lambda kv: kv[1], reverse=True)
    z=sum(v for _,v in ranked) or 1
    top=[{"domain":k,"confidence":v/z} for k,v in ranked[:3]]
    return {"domain":top[0]["domain"],"confidence":top[0]["confidence"],"top":top,"source":"python-fallback-controlled-taxonomy","trainingExamples":len(training.get('examples',[])),"feedbackExamples":0}

ALLOWED={'image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','application/pdf','text/plain','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'}

class Handler(SimpleHTTPRequestHandler):
    server_version="JharkhandiFallback/1.0"
    def log_message(self, fmt, *args): print("%s - %s" % (self.address_string(), fmt%args), flush=True)
    def _json(self,status,obj):
        raw=json.dumps(obj,ensure_ascii=False).encode('utf-8')
        self.send_response(status); self.send_header('Content-Type','application/json; charset=utf-8'); self.send_header('Content-Length',str(len(raw))); self.send_header('Cache-Control','no-store'); self.end_headers(); self.wfile.write(raw)
    def _body(self,limit=18*1024*1024):
        n=int(self.headers.get('Content-Length','0') or 0)
        if n>limit: raise ValueError('Payload too large')
        return self.rfile.read(n).decode('utf-8') if n else ''
    def _static(self,path):
        rel=urllib.parse.unquote(path.split('?',1)[0]).lstrip('/') or 'index.html'
        target=(PUBLIC/rel).resolve()
        try: target.relative_to(PUBLIC.resolve())
        except Exception: self._json(403,{"error":"Forbidden"}); return
        if not target.exists() or not target.is_file(): target=PUBLIC/'index.html'
        raw=target.read_bytes(); mime=mimetypes.guess_type(str(target))[0] or 'application/octet-stream'
        if target.suffix=='.webmanifest': mime='application/manifest+json'
        self.send_response(200); self.send_header('Content-Type',mime + ('; charset=utf-8' if mime.startswith('text/') or mime in ('application/javascript','application/json') else '')); self.send_header('Content-Length',str(len(raw))); self.send_header('Cache-Control','no-cache' if target.suffix=='.html' else 'public, max-age=300'); self.end_headers(); self.wfile.write(raw)
    def do_GET(self):
        u=urllib.parse.urlsplit(self.path); p=u.path
        if p=='/api/health': return self._json(200,{"ok":True,"service":"Jharkhandi Production API","storage":"python-sqlite-fallback","liveSync":"basic","model":{"kind":"controlled-taxonomy-fallback","trainingExamples":len(training.get('examples',[])),"reviewerCorrections":0},"serverTime":time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())})
        if p=='/api/state': return self._json(200,{"state":read_state(),"serverTime":time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),"storage":"python-sqlite-fallback"})
        if p=='/api/ml/info': return self._json(200,{"model":{"kind":"controlled-taxonomy-fallback","trainingExamples":len(training.get('examples',[])),"baseExamples":len(training.get('examples',[])),"reviewerCorrections":0,"taxonomy":training.get('taxonomy',[]),"source":training.get('source','bundled'),"seedHoldout":{"accuracy":None,"correct":None,"total":None},"humanReview":True}})
        if p=='/api/institutions': return self._json(200,{"institutions":institutions.get('institutions',institutions if isinstance(institutions,list) else []),"sources":institutions.get('sources',[]) if isinstance(institutions,dict) else [],"snapshot":institutions.get('snapshot') if isinstance(institutions,dict) else None,"note":institutions.get('note','') if isinstance(institutions,dict) else ''})
        if p=='/api/context': return self._json(200,{"context":{"live":False,"latitude":None,"longitude":None,"retrievedAt":time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())}})
        if p=='/api/events':
            # Send the initial state and close. EventSource may reconnect; normal API operations continue to work.
            payload=f"data: {json.dumps({'state':read_state(),'source':'server:init','serverTime':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())})}\n\n".encode()
            self.send_response(200); self.send_header('Content-Type','text/event-stream'); self.send_header('Cache-Control','no-cache'); self.send_header('Content-Length',str(len(payload))); self.end_headers(); self.wfile.write(payload); return
        if p.startswith('/uploads/'):
            f=(UPLOADS/Path(urllib.parse.unquote(p[len('/uploads/'):])).name).resolve()
            if f.exists() and f.is_file():
                raw=f.read_bytes(); self.send_response(200); self.send_header('Content-Type',mimetypes.guess_type(str(f))[0] or 'application/octet-stream'); self.send_header('Content-Length',str(len(raw))); self.end_headers(); self.wfile.write(raw); return
            return self._json(404,{"error":"Not found"})
        return self._static(p)
    def do_PUT(self):
        if self.path.split('?',1)[0]!='/api/state': return self._json(404,{"error":"Not found"})
        try:
            body=json.loads(self._body(10*1024*1024) or '{}'); st=body.get('state')
            if not isinstance(st,dict) or not isinstance(st.get('challenges'),list) or not isinstance(st.get('activity'),list) or not isinstance(st.get('profiles'),list): return self._json(400,{"error":"Invalid state payload"})
            write_state(st); return self._json(200,{"ok":True,"storage":"python-sqlite-fallback","serverTime":time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())})
        except Exception as e: return self._json(400,{"error":str(e)})
    def do_POST(self):
        p=self.path.split('?',1)[0]
        try: body=json.loads(self._body() or '{}')
        except Exception as e: return self._json(400,{"error":str(e)})
        if p=='/api/ml/classify':
            text=str(body.get('text','')).strip()
            if not text: return self._json(400,{"error":"Text is required"})
            return self._json(200,{"prediction":classify(text,str(body.get('chosen','')))})
        if p=='/api/ml/feedback': return self._json(200,{"ok":True,"model":{"trainingExamples":len(training.get('examples',[])),"reviewerCorrections":0}})
        if p=='/api/upload':
            out=[]
            for f in (body.get('files') or [])[:8]:
                if not isinstance(f,dict) or f.get('type') not in ALLOWED: continue
                m=re.match(r'^data:([^;]+);base64,(.+)$',str(f.get('data','')),re.S)
                if not m: continue
                try: raw=base64.b64decode(m.group(2),validate=False)
                except Exception: continue
                if len(raw)>10*1024*1024: continue
                ext=Path(str(f.get('name','file'))).suffix[:12]
                stored=f"{int(time.time()*1000)}-{uuid.uuid4().hex[:12]}{ext}"
                (UPLOADS/stored).write_bytes(raw)
                out.append({"id":"ev_"+uuid.uuid4().hex[:12],"name":f.get('name','file'),"type":f.get('type'),"size":len(raw),"addedAt":time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),"url":"/uploads/"+urllib.parse.quote(stored)})
            return self._json(200,{"files":out})
        return self._json(404,{"error":"Not found"})

if __name__=='__main__':
    try:
        httpd=ThreadingHTTPServer(('127.0.0.1',PORT),Handler)
    except OSError as e:
        print(f"ERROR: Cannot bind to localhost:{PORT}: {e}", file=sys.stderr, flush=True); sys.exit(2)
    print(f"Jharkhandi fallback server running on http://localhost:{PORT} (python sqlite)", flush=True)
    try: httpd.serve_forever()
    except KeyboardInterrupt: pass
