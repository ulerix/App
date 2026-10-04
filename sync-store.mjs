export async function initializeSync(db){
 await db.execAsync('CREATE TABLE IF NOT EXISTS sync_ack(id TEXT PRIMARY KEY); CREATE TABLE IF NOT EXISTS sync_meta(key TEXT PRIMARY KEY,value TEXT NOT NULL);');
}
export function mobileStore(db){return {
 getMeta:async key=>(await db.getFirstAsync('SELECT value FROM sync_meta WHERE key=?',key))?.value,
 setMeta:async(key,value)=>db.runAsync('INSERT OR REPLACE INTO sync_meta VALUES(?,?)',key,value),
 pending:async()=>(await db.getAllAsync('SELECT r.kind,r.payload FROM records r LEFT JOIN sync_ack a ON r.id=a.id WHERE a.id IS NULL')).map(r=>({kind:r.kind,value:JSON.parse(r.payload)})),
 ack:async id=>db.runAsync('INSERT OR IGNORE INTO sync_ack VALUES(?)',id),
 has:async id=>Boolean(await db.getFirstAsync('SELECT id FROM records WHERE id=?',id)),
 receive:async row=>db.runAsync('INSERT OR IGNORE INTO records(id,kind,payload) VALUES(?,?,?)',row.value.id,row.kind,JSON.stringify(row.value)),
};}
