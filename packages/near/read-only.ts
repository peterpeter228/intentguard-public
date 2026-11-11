import {createHash} from 'node:crypto';
export const RPC_URL='https://test.rpc.fastnear.com';
type Obj=Record<string,unknown>;
export type Rpc=(method:string,params:Obj)=>Promise<unknown>;
const obj=(v:unknown):Obj=>{if(!v||typeof v!=='object'||Array.isArray(v))throw new Error('INVALID_RPC_SCHEMA');return v as Obj;};
const integer=(v:unknown)=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=0;
const decimal=(v:unknown)=>typeof v==='string'&&/^(0|[1-9]\d{0,38})$/.test(v);
const hash=(v:unknown)=>typeof v==='string'&&/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(v);
export function validAccount(v:unknown):v is string{return typeof v==='string'&&v.length>=2&&v.length<=64&&/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/.test(v);}
export function assessKeys(raw:unknown){
 const r=obj(raw); if(!Array.isArray(r.keys)||r.keys.length>1000)throw new Error('INVALID_KEY_LIST');
 // Never treat an incomplete page as a complete account policy.
 if(Object.keys(r).some(k=>!['keys','block_hash','block_height','last_key'].includes(k)))throw new Error('UNSUPPORTED_KEY_LIST_FIELDS');
 const seen=new Set<string>();
 return r.keys.map((input:unknown)=>{const k=obj(input), a=obj(k.access_key);
  if(typeof k.public_key!=='string'||k.public_key.length===0||k.public_key.length>256||seen.has(k.public_key)||!integer(a.nonce))throw new Error('INVALID_ACCESS_KEY');seen.add(k.public_key);
  const base={publicKey:k.public_key,nonce:a.nonce,permission:a.permission};
  if(a.permission==='FullAccess')return {...base,assessment:'UNRESTRICTED_ACCOUNT_AUTHORITY',reasons:['Can transfer assets, alter keys and delete the account. Not suitable as a limited agent credential. Owner control is not evidence of maliciousness.']};
  const p=obj(a.permission);if(Object.keys(p).length!==1||!('FunctionCall' in p))return {...base,assessment:'UNKNOWN_PERMISSION',reasons:['Unsupported permission variant. No authorization can be inferred.']};
  const f=obj(p.FunctionCall);if(!validAccount(f.receiver_id)||!(f.allowance===undefined||f.allowance===null||decimal(f.allowance))||!Array.isArray(f.method_names)||f.method_names.length>1000||!f.method_names.every(x=>typeof x==='string'&&x.length>0&&x.length<=256))throw new Error('INVALID_FUNCTION_CALL_KEY');
  if(Object.keys(f).some(k=>!['receiver_id','allowance','method_names'].includes(k)))throw new Error('UNSUPPORTED_FUNCTION_CALL_FIELDS');
  const reasons=['Allowance limits gas only, not economic consequences of contract calls. Receiver code and methods were not audited.'];
  if(f.allowance===null)reasons.push('Unlimited gas allowance.');
  if(f.allowance===undefined)reasons.push('Gas allowance omitted by provider; limit unknown.');
  if(f.method_names.length===0)reasons.push('Any method on the receiver is permitted.');
  return {...base,assessment:'FUNCTION_CALL_REQUIRES_REVIEW',receiver:f.receiver_id,gasAllowanceYocto:f.allowance??null,gasAllowanceStatus:f.allowance===undefined?'UNKNOWN':f.allowance===null?'UNLIMITED':'BOUNDED',methods:f.method_names,reasons};
 });
}
export async function inspectAccount(accountId:string,rpc:Rpc,now=()=>new Date().toISOString()){
 if(!validAccount(accountId))throw new Error('INVALID_ACCOUNT_ID');
 const startedAt=now();const status=obj(await rpc('status',{}));if(status.chain_id!=='testnet')throw new Error('WRONG_NETWORK');
 const block=obj(await rpc('block',{finality:'final'})),header=obj(block.header);
 if(!hash(header.hash)||!integer(header.height))throw new Error('INVALID_BLOCK');
 const ref={block_id:header.hash,account_id:accountId};
 const account=obj(await rpc('query',{request_type:'view_account',...ref}));
 const pages:Obj[]=[];const allKeys:unknown[]=[];const cursors=new Set<string>();let cursor:string|undefined;
 for(let page=0;page<5;page++){
  const current=obj(await rpc('query',{request_type:'view_access_key_list',...ref,limit:100,...(cursor?{after_key:cursor}:{})}));
  if(current.block_hash!==header.hash||current.block_height!==header.height)throw new Error('BLOCK_MISMATCH');
  assessKeys(current); pages.push(current);allKeys.push(...current.keys as unknown[]);if(allKeys.length>500)throw new Error('KEY_BUDGET_EXCEEDED');
  const next=current.last_key;if(next==null){cursor=undefined;break;}
  if(typeof next!=='string'||!next||next.length>256||cursors.has(next)||!(current.keys as unknown[]).length)throw new Error('INVALID_PAGINATION');
  cursors.add(next);cursor=next;
 }
 if(cursor)throw new Error('INCOMPLETE_KEY_LIST');
 const keys={keys:allKeys,block_hash:header.hash,block_height:header.height};
 for(const r of [account,keys])if(r.block_hash!==header.hash||r.block_height!==header.height)throw new Error('BLOCK_MISMATCH');
 if(!decimal(account.amount)||!decimal(account.locked)||!hash(account.code_hash)||!integer(account.storage_usage))throw new Error('INVALID_ACCOUNT');
 const assessments=assessKeys(keys);
 const report={schemaVersion:'ig-near-readonly-v1',source:rpc===liveRpc?'LIVE_RPC_OBSERVATION':'INJECTED_RPC_TEST',endpoint:rpc===liveRpc?RPC_URL:null,network:'testnet',accountId,startedAt,observedAt:now(),block:{hash:header.hash,height:header.height,requestedFinality:'final'},account,keys,keyPages:pages,assessments,limits:['RPC-provider observation, not independently verified state proof.','No account ownership, signer authentication or authorization proved.','No transaction, payment, contract behavior, historical key change or competition eligibility proved.','Current observation only; keys and code can change after this block.','No keys does not prove immutability; contract code may add keys. Account age, historical activity and reputation remain unknown.']};
 return {...report,evidenceHash:createHash('sha256').update(JSON.stringify(report)).digest('hex')};
}
export const liveRpc:Rpc=async(method,params)=>{
 if(!['status','block','query'].includes(method))throw new Error('READ_ONLY_METHOD_REQUIRED');
 if(method==='query'&&!['view_account','view_access_key_list'].includes(String(params.request_type)))throw new Error('READ_ONLY_QUERY_REQUIRED');
 const response=await fetch(RPC_URL,{method:'POST',redirect:'error',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:'intentguard-readonly',method,params}),signal:AbortSignal.timeout(12000)});
 if(!response.ok)throw new Error(`RPC_HTTP_${response.status}`);
 if(!response.body)throw new Error('RPC_EMPTY');const reader=response.body.getReader();let size=0;const chunks:Uint8Array[]=[];
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>1_000_000)throw new Error('RPC_RESPONSE_TOO_LARGE');chunks.push(value);}}finally{await reader.cancel();}
 const data=obj(JSON.parse(Buffer.concat(chunks).toString('utf8')));
 if(data.error)throw new Error('RPC_REPORTED_ERROR');if(data.jsonrpc!=='2.0'||data.id!=='intentguard-readonly'||!('result' in data))throw new Error('RPC_ENVELOPE_INVALID');return data.result;
};
