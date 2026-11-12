import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

// Execute the actual frontend rendering logic with a minimal DOM, not a browser claim.
for (const status of ['RESERVED','NEEDS_APPROVAL','UNKNOWN','SIMULATED_SETTLED','DENIED','CANCELLED']) {
  test(`stale policy cancellation copy respects ${status} state`, async () => {
    const elements = new Map();
    function element(tag) {return {tag,textContent:'',children:[],append(...xs){this.children.push(...xs)},replaceChildren(){this.children=[]}};}
    const document = {createElement:element,getElementById(id){if(!elements.has(id))elements.set(id,element(id));return elements.get(id)},querySelectorAll(){return []}};
    const state = {policy:{revision:2,paused:false,perTx:'1',daily:'10'},budget:{day:'2026-11-04',spent:'0',pending:'1',limit:'10'},purchases:[{id:'p1',state:status,reasonCode:'fixture',request:{target:'example.testnet',reason:'test'},payee:'merchant.testnet',amount:'1',policy:{revision:1},requestHash:'test'}]};
    const context = vm.createContext({document,sessionStorage:{getItem(){return null},setItem(){}},crypto:{randomUUID(){return 'request'}},fetch:async()=>({ok:true,json:async()=>state}),setTimeout,clearTimeout,URL,Blob});
    vm.runInContext(readFileSync('apps/web/app.js','utf8'),context);
    await vm.runInContext('refresh()',context);
    const texts=[];function walk(el){texts.push(el.textContent);el.children.forEach(walk)}walk(elements.get('purchases'));
    const cancellable = ['RESERVED','NEEDS_APPROVAL'].includes(status);
    assert.equal(texts.some(s=>s.includes('cancel the unsigned request')),cancellable);
    assert.equal(texts.includes('Cancel unsigned local request'),cancellable);
    assert.equal(texts.some(s=>s.includes('reservation stays locked')),status==='UNKNOWN');
    assert.ok(texts.includes('Download evidence'));
  });
}

test('failed inspection clears stale scope, enforces cooldown across refresh, and only retries manually',async()=>{
 const elements=new Map();
 function element(tag){return {tag,textContent:'',value:'',children:[],append(...xs){this.children.push(...xs)},replaceChildren(){this.children=[]}};}
 const document={createElement:element,getElementById(id){if(!elements.has(id))elements.set(id,element(id));return elements.get(id)},querySelectorAll(){return [this.getElementById('near-read')]}};
 const state={policy:{revision:1,paused:false,perTx:'1',daily:'10'},budget:{day:'test',spent:'0',pending:'0',limit:'10'},purchases:[]};
 let now=100000,calls=0;const timers=[];
 const context=vm.createContext({document,Date:{now:()=>now},Number,sessionStorage:{getItem(){return null},setItem(){}},crypto:{randomUUID(){return 'request'}},fetch:async path=>path==='/api/near-inspect'?(calls++,{ok:false,json:async()=>({code:'RPC_TRANSPORT_UNAVAILABLE',message:'Server cannot reach RPC.',retryAfterSeconds:30})}):({ok:true,json:async()=>state}),setTimeout:fn=>(timers.push(fn),timers.length),clearTimeout(){},URL,Blob});
 vm.runInContext(readFileSync('apps/web/app.js','utf8'),context);
 const settle=()=>new Promise(resolve=>setImmediate(resolve));await settle();
 for(const id of ['near-result','scope-result'])document.getElementById(id).textContent='stale success';
 for(const id of ['scope-account','scope-key'])document.getElementById(id).value='stale';
 const submit=()=>document.getElementById('near-inspect').onsubmit({preventDefault(){}});
 submit();submit();await settle();assert.equal(calls,1);
 assert.equal(elements.get('near-read').disabled,true);assert.match(elements.get('near-read').textContent,/30s/);assert.equal(elements.get('error').textContent,'Server cannot reach RPC.');
 for(const id of ['near-result','scope-result'])assert.equal(elements.get(id).textContent,'');
 for(const id of ['scope-account','scope-key'])assert.equal(elements.get(id).value,'');
 document.getElementById('refresh').onclick();await settle();assert.equal(elements.get('near-read').disabled,true);
 now+=31000;timers.at(-1)();assert.equal(elements.get('near-read').disabled,false);assert.equal(calls,1);
 submit();await settle();assert.equal(calls,2);
});
