import React, {useEffect, useRef, useState} from 'react';
import {Alert, AppState, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';
import {SafeAreaProvider, SafeAreaView} from 'react-native-safe-area-context';
import * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import * as DocumentPicker from 'expo-document-picker';
import {File, Paths} from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as SecureStore from 'expo-secure-store';
import {initializeSync, mobileStore, syncMobile, makeRequest} from './sync-mobile';
import {matches, chronological} from './model.mjs';

function Button({children,onPress,disabled=false}) {return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={[s.button,disabled&&{opacity:.5}]}><Text style={s.buttonText}>{children}</Text></Pressable>}
function Field({placeholder,value,onChangeText,...props}) {return <TextInput accessibilityLabel={placeholder} placeholder={placeholder} placeholderTextColor="#64748b" value={value} onChangeText={onChangeText} style={s.input} {...props}/>}
function AppContent(){
 const db=useRef(null),lock=useRef(false),syncLock=useRef(false),runRef=useRef(null);
 const [config,setConfig]=useState(null),[settings,setSettings]=useState(false),[url,setUrl]=useState(''),[token,setToken]=useState(''),[syncing,setSyncing]=useState(false),[syncText,setSyncText]=useState('Partage non configuré'),[acked,setAcked]=useState(new Set());
 const [ready,setReady]=useState(false),[fatal,setFatal]=useState(''),[busy,setBusy]=useState(false);
 const [data,setData]=useState({clients:[],jobs:[],entries:[]});
 const [clientId,setClientId]=useState(null),[jobId,setJobId]=useState(null),[query,setQuery]=useState('');
 const [form,setForm]=useState(null),[draft,setDraft]=useState({}),[note,setNote]=useState('');
 const client=data.clients.find(c=>c.id===clientId),job=data.jobs.find(j=>j.id===jobId);
 const reload=async()=>{const rows=await db.current.getAllAsync('SELECT kind,payload FROM records'); const next={clients:[],jobs:[],entries:[]}; for(const r of rows) next[r.kind].push(JSON.parse(r.payload));setData(next);setAcked(new Set((await db.current.getAllAsync('SELECT id FROM sync_ack')).map(r=>r.id)))};
 useEffect(()=>{let active=true;(async()=>{db.current=await SQLite.openDatabaseAsync('dpgaz-prototype.db');await db.current.execAsync('PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS records(id TEXT PRIMARY KEY NOT NULL,kind TEXT NOT NULL,payload TEXT NOT NULL);');await initializeSync(db.current);if(active){await reload();setReady(true);try{const saved=await SecureStore.getItemAsync('dpgaz-sharing');if(saved){const c=JSON.parse(saved);setConfig(c);setUrl(c.url);setToken(c.token);setSyncText('Connexion au partage…')}}catch{setSyncText('Réglez la connexion au partage.')}}})().catch(()=>{if(active)setFatal('Impossible d’ouvrir les dossiers. Fermez puis relancez l’application.');});return()=>{active=false}},[]);
 const runSync=async()=>{
  if(!ready||!config||syncLock.current)return;
  syncLock.current=true;setSyncing(true);setSyncText('Échange en cours…');
  try{const result=await syncMobile(db.current,config);await reload();setSyncText(result.pending?'Des ajouts attendent encore leur envoi.':'Dernier échange réussi à '+new Date().toLocaleTimeString('fr-CA'));}
  catch(error){setSyncText('Partage interrompu : '+(error.message||'connexion indisponible')+' Les ajouts restent sur ce téléphone.');}
  finally{syncLock.current=false;setSyncing(false);}
 };
 useEffect(()=>{runRef.current=runSync});
 useEffect(()=>{
  if(!ready||!config)return;
  runRef.current();
  const timer=setInterval(()=>runRef.current(),30000);
  const sub=AppState.addEventListener('change',state=>{if(state==='active')runRef.current()});
  return()=>{clearInterval(timer);sub.remove()};
 },[ready,config]);
 const connect=async()=>{
  if(syncLock.current)return;
  syncLock.current=true;setSyncing(true);
  try{
   const c={url:url.trim().replace(/\/+$/,''),token:token.trim()};
   if(c.token.length<32)throw new Error('Le code de connexion est incomplet.');
   const {serverId}=await makeRequest(c.url,c.token)('/identity');
   const bound=await mobileStore(db.current).getMeta('serverId');
   if(bound&&bound!==serverId)throw new Error('Ces dossiers sont liés à un autre espace partagé.');
   await SecureStore.setItemAsync('dpgaz-sharing',JSON.stringify(c));setConfig(c);setSettings(false);
  }catch(error){Alert.alert('Connexion non terminée',error.message)}
  finally{syncLock.current=false;setSyncing(false)}
 };
 const save=async(kind,value)=>{await db.current.runAsync('INSERT INTO records(id,kind,payload) VALUES(?,?,?)',value.id,kind,JSON.stringify(value));await reload();if(config)setSyncText('Nouvel ajout enregistré sur ce téléphone, en attente d’envoi.')};
 const act=async(fn)=>{if(lock.current)return;lock.current=true;setBusy(true);try{await fn()}catch(_error){Alert.alert('Ajout non terminé','Les données n’ont pas pu être enregistrées. Vérifiez l’espace disponible et réessayez.')}finally{lock.current=false;setBusy(false)}};
 const create=()=>act(async()=>{if(!(draft.name||'').trim()){Alert.alert('Nom requis','Indiquez le nom du client ou de la job.');return;}const base={id:Crypto.randomUUID(),created:new Date().toISOString()};if(form==='client'){const number=(draft.number||'').trim()||'C-'+base.id.slice(0,8).toUpperCase();if(data.clients.some(c=>c.number.toLowerCase()===number.toLowerCase())){Alert.alert('Numéro déjà utilisé','Choisissez un autre numéro de client.');return;}await save('clients',{...base,name:draft.name.trim(),number,phone:draft.phone||'',address:draft.address||''});setClientId(base.id)}else{await save('jobs',{...base,clientId,title:draft.name.trim(),address:draft.address||client.address,status:'En cours'});setJobId(base.id)}setForm(null);setDraft({})});
 const addNote=()=>act(async()=>{if(!note.trim())return;await save('entries',{id:Crypto.randomUUID(),jobId,created:new Date().toISOString(),type:'Note',text:note.trim(),author:'Utilisateur local'});setNote('')});
 const attach=()=>act(async()=>{const result=await DocumentPicker.getDocumentAsync({type:['image/*','application/pdf'],copyToCacheDirectory:true,multiple:false});if(result.canceled)return;const asset=result.assets[0];if((asset.size||0)>25*1024*1024){Alert.alert('Fichier trop volumineux','La limite du prototype est de 25 Mo par fichier.');return;}const id=Crypto.randomUUID(),extension=asset.name.match(/\.[a-z0-9]{1,8}$/i)?.[0]||'';const filename=id+extension;const target=new File(Paths.document,filename);new File(asset.uri).copy(target);try{await save('entries',{id,jobId,created:new Date().toISOString(),type:asset.mimeType?.startsWith('image/')?'Photo':'Document',text:asset.name,filename,mime:asset.mimeType||'',author:'Utilisateur local'})}catch(e){throw e; /* Keep copied file if DB write succeeded but refresh failed. */}});
 const openDocument=(entry)=>act(async()=>{if(!await Sharing.isAvailableAsync()){Alert.alert('Ouverture indisponible');return;}await Sharing.shareAsync(new File(Paths.document,entry.filename).uri,{mimeType:entry.mime||undefined,dialogTitle:entry.text})});
 const back=()=>{setForm(null);setDraft({});setNote('');if(jobId)setJobId(null);else setClientId(null)};
 return <SafeAreaView style={s.safe}><KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.page}>
 <View style={s.header}><Text style={s.brand}>DP GAZ</Text><Text style={s.tagline}>Dossiers de chantier</Text></View>
 <View style={s.notice}><Text style={s.noticeText}>VERSION DE TEST · données fictives uniquement</Text><Text>{syncText}</Text>{ready&&<><Text>{data.clients.length+data.jobs.length+data.entries.length-acked.size} ajout(s) en attente d’envoi</Text><Button disabled={syncing} onPress={()=>setSettings(!settings)}>Configurer le partage</Button>{config&&<Button disabled={syncing} onPress={runSync}>{syncing?'Échange en cours…':'Synchroniser maintenant'}</Button>}</>}</View>
 {settings&&<View style={s.card}><Text style={s.section}>Espace commun DP Gaz</Text><Text>Tous les employés connectés à cet espace verront les mêmes dossiers. La connexion transmettra aussi les dossiers déjà présents sur ce téléphone.</Text><Field placeholder="Adresse du service partagé (https://…)" autoCapitalize="none" autoCorrect={false} value={url} onChangeText={setUrl}/><Field placeholder="Code de connexion de l’équipe" secureTextEntry autoCapitalize="none" autoCorrect={false} value={token} onChangeText={setToken}/><Button disabled={syncing} onPress={connect}>Connecter et partager ces dossiers</Button></View>}
 {!ready?<Text>{fatal||'Ouverture des dossiers…'}</Text>:<>
 {(client||form)&&<Button disabled={busy} onPress={back}>← Retour</Button>}
 {form?<View style={s.card}><Text style={s.title}>{form==='client'?'Nouveau client':'Nouvelle job'}</Text>
 <Field placeholder={form==='client'?'Nom du client':'Nom de la job'} value={draft.name||''} onChangeText={name=>setDraft({...draft,name})}/>
 {form==='client'&&<><Field placeholder="Numéro client (facultatif)" value={draft.number||''} onChangeText={number=>setDraft({...draft,number})}/><Field placeholder="Téléphone" keyboardType="phone-pad" value={draft.phone||''} onChangeText={phone=>setDraft({...draft,phone})}/></>}
 <Field placeholder="Adresse" value={draft.address||''} onChangeText={address=>setDraft({...draft,address})}/>
 <Button disabled={busy} onPress={create}>Enregistrer sur ce téléphone</Button>
 <Button disabled={busy} onPress={()=>{setForm(null);setDraft({})}}>Annuler</Button></View>
 :job?<><Text style={s.eyebrow}>{client.name} · {client.number}</Text><Text style={s.title}>{job.title}</Text><Text style={s.muted}>{job.address}</Text><Text style={s.section}>Historique · du plus ancien au plus récent</Text>
 {chronological(data.entries.filter(e=>e.jobId===jobId)).map(e=><View key={e.id} style={s.card}><Text style={s.eyebrow}>{e.type} · {new Date(e.created).toLocaleString('fr-CA')}</Text><Text style={s.body}>{e.text}</Text>{e.type==='Photo'&&<Image accessibilityLabel={e.text} source={{uri:new File(Paths.document,e.filename).uri}} style={s.photo} resizeMode="contain"/>}{e.filename&&<Button disabled={busy} onPress={()=>openDocument(e)}>Ouvrir / partager le fichier</Button>}<Text style={s.muted}>{e.author} · {acked.has(e.id)?'reçu par le serveur':'en attente d’envoi'}</Text></View>)}
 {!data.entries.some(e=>e.jobId===jobId)&&<Text style={s.muted}>Aucune activité. Ajoutez une note, une photo ou une facture.</Text>}
 <View style={s.card}><Field placeholder="Ajouter une note sur la job…" multiline value={note} onChangeText={setNote}/><Button disabled={busy||!note.trim()} onPress={addNote}>Ajouter la note</Button><Button disabled={busy} onPress={attach}>Joindre une photo ou un PDF</Button></View></>
 :client?<><Text style={s.eyebrow}>{client.number}</Text><Text style={s.title}>{client.name}</Text><Text style={s.body}>{client.phone}</Text><Text style={s.muted}>{client.address}</Text><Button disabled={busy} onPress={()=>{setDraft({address:client.address});setForm('job')}}>+ Ajouter une job</Button><Text style={s.section}>Toutes les jobs du client</Text>{data.jobs.filter(j=>j.clientId===clientId).sort((a,b)=>b.created.localeCompare(a.created)).map(j=><Pressable accessibilityRole="button" key={j.id} onPress={()=>setJobId(j.id)} style={s.card}><Text style={s.cardTitle}>{j.title}</Text><Text>{j.address}</Text><Text style={s.muted}>{j.status} · {data.entries.filter(e=>e.jobId===j.id).length} éléments</Text></Pressable>)}{!data.jobs.some(j=>j.clientId===clientId)&&<Text style={s.muted}>Aucune job pour ce client.</Text>}</>
 :<><Text style={s.title}>Clients</Text><Field placeholder="Nom, téléphone, numéro, adresse ou job" value={query} onChangeText={setQuery}/><Button onPress={()=>{setDraft({});setForm('client')}}>+ Ajouter un client</Button>{data.clients.filter(c=>matches(c,data.jobs.filter(j=>j.clientId===c.id),query)).sort((a,b)=>a.name.localeCompare(b.name,'fr')).map(c=><Pressable accessibilityRole="button" key={c.id} onPress={()=>setClientId(c.id)} style={s.card}><Text style={s.eyebrow}>{c.number}</Text><Text style={s.cardTitle}>{c.name}</Text><Text>{c.phone}</Text><Text style={s.muted}>{c.address}</Text><Text style={s.muted}>{data.jobs.filter(j=>j.clientId===c.id).length} jobs</Text></Pressable>)}{!data.clients.some(c=>matches(c,data.jobs.filter(j=>j.clientId===c.id),query))&&<Text style={s.muted}>{query?'Aucun dossier correspondant.':'Ajoutez un premier client fictif pour explorer les dossiers.'}</Text>}</>}
 </>}
 </ScrollView></KeyboardAvoidingView></SafeAreaView>
}
export default function App(){return <SafeAreaProvider><AppContent/></SafeAreaProvider>}
const s=StyleSheet.create({safe:{flex:1,backgroundColor:'#f1f5f9'},page:{padding:20,gap:14,paddingBottom:60},header:{backgroundColor:'#123a70',padding:24,borderRadius:20},brand:{color:'white',fontSize:30,fontWeight:'900',letterSpacing:2},tagline:{color:'#bedaff',marginTop:5,fontSize:16},notice:{backgroundColor:'#fff2cd',padding:12,borderRadius:12,gap:6},noticeText:{fontWeight:'700',color:'#674c00',fontSize:12},title:{fontSize:28,fontWeight:'800',color:'#102c51'},section:{fontSize:18,fontWeight:'700',color:'#102c51',marginTop:10},eyebrow:{color:'#34649d',fontSize:12,fontWeight:'700'},card:{backgroundColor:'white',borderRadius:16,padding:18,gap:10,borderWidth:1,borderColor:'#e2e8f0'},cardTitle:{fontSize:20,fontWeight:'700',color:'#102c51'},body:{fontSize:16,color:'#1e293b'},muted:{color:'#52657b',fontSize:14},input:{borderWidth:1,borderColor:'#bdcce0',backgroundColor:'white',padding:14,borderRadius:10,fontSize:16,color:'#102c51',minHeight:48},button:{backgroundColor:'#155db1',padding:14,borderRadius:10,minHeight:48,alignItems:'center'},buttonText:{color:'white',fontWeight:'700',fontSize:15},photo:{width:'100%',height:220,backgroundColor:'#eef3f8',borderRadius:8}});
