import test from 'node:test';
import assert from 'node:assert/strict';
import {liveRpc,inspectionFailure,RPC_URL} from '../dist/packages/near/read-only.js';
const envelope=result=>JSON.stringify({jsonrpc:'2.0',id:'intentguard-readonly',result});
test('fixed transport POST retains deadline and redirect refusal',async t=>{
 let calls=0;
 t.mock.method(globalThis,'fetch',async(url,options)=>{calls++;assert.equal(url,RPC_URL);assert.equal(options.method,'POST');assert.equal(options.redirect,'error');assert.ok(options.signal instanceof AbortSignal);assert.equal(JSON.parse(options.body).method,'status');return new Response(envelope({chain_id:'testnet'}));});
 assert.deepEqual(await liveRpc('status',{}),{chain_id:'testnet'});assert.equal(calls,1);
});
for(const [label,result,code] of [
 ['connection failure',()=>{throw new TypeError('fetch failed: private internal network address')},'RPC_TRANSPORT_UNAVAILABLE'],
 ['timeout',()=>{throw new DOMException('private detail','TimeoutError')},'RPC_TIMEOUT'],
 ['provider throttling',()=>new Response('private detail',{status:429}),'RPC_HTTP_429'],
 ['invalid JSON',()=>new Response('private detail'),'RPC_INVALID_JSON'],
 ['bad envelope',()=>new Response(JSON.stringify({jsonrpc:'2.0',id:'wrong',result:{}})),'RPC_ENVELOPE_INVALID'],
 ['provider error',()=>new Response(JSON.stringify({error:{message:'private detail'}})),'RPC_REPORTED_ERROR'],
 ['oversize body',()=>new Response('x'.repeat(1_000_001)),'RPC_RESPONSE_TOO_LARGE'],
 ['body stream failure',()=>new Response(new ReadableStream({start(c){c.error(new TypeError('private detail'))}})),'RPC_TRANSPORT_UNAVAILABLE'],
]) test(label+' is sanitized and never automatically retried',async t=>{
 let calls=0;t.mock.method(globalThis,'fetch',async()=>{calls++;return result()});
 await assert.rejects(liveRpc('status',{}),error=>{const failure=inspectionFailure(error);assert.equal(failure.code,code);assert.doesNotMatch(JSON.stringify(failure),/private detail|internal network/);return true;});assert.equal(calls,1);
});
test('unexpected errors cannot leak through public failure contract',()=>{
 assert.equal(inspectionFailure(new Error('secret payload')).code,'RPC_OBSERVATION_REJECTED');
});

test('known fail-closed observation refusals retain precise codes',()=>{for(const code of ['WRONG_NETWORK','BLOCK_MISMATCH','INCOMPLETE_KEY_LIST'])assert.equal(inspectionFailure(new Error(code)).code,code);});
