import {File,Paths} from 'expo-file-system';
import {synchronize} from './sync-core.mjs';
import {mobileStore} from './sync-store.mjs';
export {initializeSync,mobileStore} from './sync-store.mjs';
export function makeRequest(url,token){
 const parsed=new URL(url);
 if(parsed.protocol!=='https:'||parsed.username||parsed.password||parsed.search||parsed.hash) throw new Error('Indiquez une adresse HTTPS valide.');
 return async(path,options={})=>{
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),60000);
  try{
   const response=await fetch(url.replace(/\/+$/,'')+path,{...options,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},signal:controller.signal});
   if(!response.ok) {const body=await response.json().catch(()=>({}));throw new Error(body.error||'Serveur indisponible.');}
   return await response.json();
  }finally{clearTimeout(timer);}
 };
}
export async function syncMobile(db,config){
 return synchronize({store:mobileStore(db),request:makeRequest(config.url,config.token),
  readFile:async name=>new File(Paths.document,name).base64(),
  writeFile:async(name,base64)=>{
   // Write to a temporary file: no visible DB record until the full file is durable.
   if(!/^[a-f0-9-]{36}(?:\.[a-z0-9]{1,8})?$/i.test(name)) throw new Error('Nom de fichier refusé.');
   const temp=new File(Paths.document,name+'.incoming');temp.write(base64,{encoding:'base64'});
   const destination=new File(Paths.document,name);if(destination.exists)destination.delete();temp.move(destination);
  },
 });
}
