import test from 'node:test';import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';import {pathToFileURL} from 'node:url';
test('HTTP reports sanitized RPC failure, manual retry timing and no usable observation',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'ig-rpc-http-')),port=14374,base=`http://127.0.0.1:${port}`;
 const preload=join(dir,'transport.mjs');writeFileSync(preload,"globalThis.fetch=async()=>{throw new TypeError('fetch failed: private network details')};");
 const proc=spawn(process.execPath,['--import',pathToFileURL(preload).href,'dist/apps/api/server.js','--init'],{env:{...process.env,PORT:String(port),IG_DB:join(dir,'db')},stdio:['ignore','pipe','pipe']});
 try{
  await new Promise((resolve,reject)=>{proc.stdout.once('data',resolve);proc.once('exit',c=>reject(Error('server exit '+c)));});
  const post=(path,body)=>fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',Origin:base},body:JSON.stringify(body)});
  let r=await post('/api/near-inspect',{accountId:'wrap.testnet'});assert.equal(r.status,503);let body=await r.json();assert.equal(body.code,'RPC_TRANSPORT_UNAVAILABLE');assert.match(body.message,/local server cannot reach/);assert.doesNotMatch(JSON.stringify(body),/private network/);assert.ok(body.retryAfterSeconds>0&&body.retryAfterSeconds<=30);
  r=await post('/api/near-preflight',{});assert.equal(r.status,409);assert.equal((await r.json()).code,'LIVE_OBSERVATION_REQUIRED');
  r=await post('/api/near-inspect',{accountId:'wrap.testnet'});assert.equal(r.status,429);body=await r.json();assert.equal(body.code,'READ_ONLY_COOLDOWN');assert.ok(body.retryAfterSeconds>0&&body.retryAfterSeconds<=30);
 }finally{proc.kill();await new Promise(r=>proc.once('exit',r));rmSync(dir,{recursive:true});}
});
