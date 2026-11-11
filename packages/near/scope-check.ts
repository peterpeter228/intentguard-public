import {createHash} from 'node:crypto';
import {validAccount,assessKeys} from './read-only.js';
type RecordValue=Record<string,unknown>;
const record=(v:unknown):RecordValue=>{if(!v||typeof v!=='object'||Array.isArray(v))throw new Error('INVALID_INPUT');return v as RecordValue;};
const canonical=(v:unknown):string=>{if(v===null||typeof v!=='object')return JSON.stringify(v);if(Array.isArray(v))return '['+v.map(canonical).join(',')+']';return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical((v as RecordValue)[k])).join(',')+'}';};
const digest=(v:unknown)=>createHash('sha256').update(canonical(v)).digest('hex');
export const SCOPE_POLICY=Object.freeze({id:'ig-readonly-scope-v1',network:'testnet',receiverId:'wrap.testnet',methodName:'ft_balance_of',maximumGas:'30000000000000',depositYocto:'0',maximumAgeMs:120000});
/** No signer or RPC call exists here. A match is a diagnostic, never an execution capability. */
export function checkScope(snapshotInput:unknown,proposalInput:unknown,nowMs=Date.now()){
 const snapshot=record(snapshotInput), proposal=record(proposalInput);
 const fields=['accountId','publicKey','receiverId','methodName','gas','depositYocto','args'];
 if(Object.keys(proposal).length!==fields.length||fields.some(k=>!(k in proposal)))throw new Error('INVALID_PROPOSAL');
 if(!validAccount(proposal.accountId)||!validAccount(proposal.receiverId)||typeof proposal.publicKey!=='string'||!proposal.publicKey||typeof proposal.methodName!=='string'||typeof proposal.gas!=='string'||!/^[1-9][0-9]{0,19}$/.test(proposal.gas)||typeof proposal.depositYocto!=='string'||!/^(0|[1-9][0-9]{0,38})$/.test(proposal.depositYocto))throw new Error('INVALID_PROPOSAL');
 const args=record(proposal.args);if(Object.keys(args).length!==1||!validAccount(args.account_id))throw new Error('INVALID_ARGUMENTS');
 const {evidenceHash,...preimage}=snapshot;const expected=createHash('sha256').update(JSON.stringify(preimage)).digest('hex');
 if(evidenceHash!==expected)throw new Error('SNAPSHOT_HASH_MISMATCH');
 if(snapshot.schemaVersion!=='ig-near-readonly-v1'||!['LIVE_RPC_OBSERVATION','INJECTED_RPC_TEST'].includes(String(snapshot.source)))throw new Error('UNSUPPORTED_SNAPSHOT');
 const block=record(snapshot.block),keys=record(snapshot.keys);if(typeof block.hash!=='string'||!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(block.hash)||typeof block.height!=='number'||!Number.isSafeInteger(block.height)||block.height<0||block.requestedFinality!=='final')throw new Error('INVALID_BLOCK');assessKeys(keys);if(!Array.isArray(keys.keys)||keys.block_hash!==block.hash||keys.block_height!==block.height)throw new Error('INCONSISTENT_SNAPSHOT');
 const observed=Date.parse(String(snapshot.observedAt)),started=Date.parse(String(snapshot.startedAt));if(!Number.isFinite(observed)||!Number.isFinite(started)||started>observed||!Number.isFinite(nowMs))throw new Error('INVALID_TIME');
 const reasons:string[]=[];let denied=false;let review=false;
 const deny=(reason:string)=>{denied=true;reasons.push(reason);};
 if(snapshot.network!==SCOPE_POLICY.network)deny('WRONG_NETWORK');
 if(snapshot.accountId!==proposal.accountId)deny('ACCOUNT_MISMATCH');
 if(nowMs<observed||nowMs-started>SCOPE_POLICY.maximumAgeMs)deny('SNAPSHOT_NOT_FRESH');
 if(proposal.receiverId!==SCOPE_POLICY.receiverId)deny('RECEIVER_NOT_ALLOWED');
 if(proposal.methodName!==SCOPE_POLICY.methodName)deny('METHOD_NOT_ALLOWED');
 if(proposal.depositYocto!==SCOPE_POLICY.depositYocto)deny('NONZERO_DEPOSIT');
 if(BigInt(proposal.gas)>BigInt(SCOPE_POLICY.maximumGas))deny('GAS_LIMIT');
 const selected=keys.keys.filter(x=>record(x).public_key===proposal.publicKey);if(selected.length!==1)deny('KEY_NOT_UNIQUELY_OBSERVED');
 else {
  const permission=record(record(selected[0]).access_key).permission;
  if(permission==='FullAccess')deny('FULL_ACCESS_NOT_AGENT_SCOPED');
  else {
   const p=record(permission);if(Object.keys(p).length!==1||!('FunctionCall' in p))deny('UNSUPPORTED_PERMISSION');
   else {const f=record(p.FunctionCall);
    if(f.receiver_id!==proposal.receiverId)deny('KEY_RECEIVER_MISMATCH');
    if(!Array.isArray(f.method_names)||!f.method_names.every(x=>typeof x==='string'))deny('INVALID_KEY_METHODS');
    else if(f.method_names.length===0){review=true;reasons.push('KEY_PERMITS_ALL_METHODS');}
    else if(!f.method_names.includes(proposal.methodName))deny('KEY_METHOD_MISMATCH');
    if(typeof f.allowance!=='string'||!/^[1-9][0-9]{0,38}$/.test(f.allowance)){review=true;reasons.push('GAS_ALLOWANCE_NOT_BOUNDED_POSITIVE');}
   }
  }
 }
 return {schemaVersion:'ig-scope-check-v1',source:'SUPPLIED_SNAPSHOT_DIAGNOSTIC',claimedSnapshotSource:snapshot.source,network:snapshot.network,outcome:denied?'DENY':review?'REVIEW':'SCOPE_MATCH_PENDING_OWNER',reasons,policy:SCOPE_POLICY,policyHash:digest(SCOPE_POLICY),proposal,proposalHash:digest(proposal),snapshotHash:evidenceHash,block,checkedAt:new Date(nowMs).toISOString(),signed:false,executed:false,authorizationGranted:false,limitations:['Local scope diagnostic only. No owner authentication or signing authority is granted.','Snapshot RPC evidence is not an independently verified state proof and can become stale.','Gas allowance is not an asset spending cap; gas cost and receiver behavior are not verified.','Full-access owner keys are normal, but are not accepted as limited agent keys by this policy.']};
}
