import {inspectAccount,liveRpc} from '../dist/packages/near/read-only.js';
const account=process.argv[2];if(!account){console.error('Usage: node scripts/inspect-near.mjs PUBLIC_TESTNET_ACCOUNT');process.exit(2)}
try{console.log(JSON.stringify(await inspectAccount(account,liveRpc),null,2));}catch(e){console.error(JSON.stringify({status:'FAILED',checkedAt:new Date().toISOString(),code:e.message,chainObservation:false}));process.exitCode=1;}
