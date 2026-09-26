import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
const ROOT=path.dirname(fileURLToPath(import.meta.url))
const DATA=process.env.DATA_DIR?path.resolve(process.env.DATA_DIR):path.join(ROOT,'data')
const seed=fs.readFileSync(path.join(ROOT,'data','demo_state.json'),'utf8')
fs.mkdirSync(DATA,{recursive:true})
try{
  const {DatabaseSync}=await import('node:sqlite')
  const db=new DatabaseSync(path.join(DATA,'jharkhandi.sqlite'))
  db.exec(`CREATE TABLE IF NOT EXISTS app_state (id INTEGER PRIMARY KEY CHECK(id=1), json TEXT NOT NULL, updated_at TEXT NOT NULL);`)
  db.prepare(`INSERT INTO app_state(id,json,updated_at) VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET json=excluded.json, updated_at=excluded.updated_at`).run(seed,new Date().toISOString())
  console.log('DEMONSTRATION DATA seeded into SQLite:',path.join(DATA,'jharkhandi.sqlite'))
}catch(err){
  fs.writeFileSync(path.join(DATA,'db.json'),seed)
  console.log('SQLite unavailable; DEMONSTRATION DATA seeded into JSON fallback:',err?.message||err)
}
