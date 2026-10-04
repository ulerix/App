// Additive protocol: a record ID never changes its contents. A lost reply is safe to retry.
export async function synchronize({store,request,readFile,writeFile}) {
 const {serverId}=await request('/identity');
 const bound=await store.getMeta('serverId');
 if(bound&&bound!==serverId) throw new Error('Ce téléphone est lié à un autre espace partagé.');
 if(!bound) await store.setMeta('serverId',serverId);
 const pending=await store.pending();
 const rank={clients:0,jobs:1,entries:2};
 pending.sort((a,b)=>rank[a.kind]-rank[b.kind]);
 for(const row of pending){
  const body={kind:row.kind,value:row.value};
  if(row.value.filename) body.file=await readFile(row.value.filename);
  const ack=await request('/records',{method:'POST',body:JSON.stringify(body)});
  if(ack.id!==row.value.id) throw new Error('Réponse du serveur inattendue.');
  await store.ack(row.value.id);
 }
 let cursor=Number(await store.getMeta('cursor')||0);
 while(true){
  const {rows}=await request('/records?after='+cursor);
  for(const row of rows){
   if(!Number.isSafeInteger(row.seq)||row.seq<=cursor) throw new Error('Ordre du serveur invalide.');
   const exists=await store.has(row.value.id);
   if(!exists&&row.value.filename){
    const {base64}=await request('/files/'+row.value.id);
    await writeFile(row.value.filename,base64);
   }
   await store.receive(row);
   await store.ack(row.value.id);
   cursor=row.seq;
   await store.setMeta('cursor',String(cursor));
  }
  if(rows.length<100) break;
 }
 return {pending:(await store.pending()).length};
}
