import test from 'node:test';
import assert from 'node:assert/strict';
import {matches,chronological} from './model.mjs';
const client={name:'Émile Test',number:'C-001',phone:'(450) 555-0123',address:'12 rue Exemple'};
const jobs=[{title:'Génératrice garage',address:'80 avenue Démonstration'}];
test('retrouve un client par ses coordonnées et les adresses de ses jobs',()=>{for(const q of ['emile','4505550123','C-001','generatrice','80 avenue demonstration'])assert.equal(matches(client,jobs,q),true,q);assert.equal(matches(client,jobs,'introuvable'),false)});
test('une adresse numérique ne correspond pas arbitrairement au téléphone',()=>assert.equal(matches(client,jobs,'450 autre rue'),false));
test('chronologie stable sans modifier la liste source',()=>{const rows=[{id:'b',created:'2026-09-30T15:00:00Z'},{id:'a',created:'2026-09-29T15:00:00Z'}];assert.deepEqual(chronological(rows).map(r=>r.id),['a','b']);assert.equal(rows[0].id,'b')});
