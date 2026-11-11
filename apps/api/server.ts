import { checkScope } from '../../packages/near/scope-check.js';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { inspectAccount, liveRpc, validAccount } from '../../packages/near/read-only.js';
import { Workbench, GuardError } from '../../packages/core/workbench.js';
if (process.env.APP_MODE && process.env.APP_MODE !== 'fixture') throw new Error('Only fixture mode is implemented');
if (process.env.ENABLE_SIGNER && process.env.ENABLE_SIGNER !== 'false') throw new Error('Signer is not implemented');
const port=Number(process.env.PORT??4173);
if(!Number.isInteger(port)||port<1024||port>65535)throw new Error('Invalid port');
const origin=`http://127.0.0.1:${port}`;
const db=new Workbench(process.env.IG_DB??'private/workbench.sqlite',{initialize:process.argv.includes('--init')});
let inspectionBusy=false;let lastInspection=0;let latestInspection:Awaited<ReturnType<typeof inspectAccount>>|null=null;
createServer(async(req,res)=>{
 const send=(status:number,v:unknown)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(v));};
 if(req.headers.host!==`127.0.0.1:${port}`){send(403,{code:'INVALID_HOST'});return;}
 if(req.method!=='GET'&&(req.headers.origin!==origin||req.headers['content-type']!=='application/json')){send(403,{code:'SAME_ORIGIN_REQUIRED'});return;}
 try {
  const path=(req.url??'/').split('?')[0];
  if(req.method==='GET'&&path==='/'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; frame-ancestors 'none'; base-uri 'none'"});res.end(readFileSync('apps/web/index.html'));return;}
  if(req.method==='GET'&&(path==='/app.js'||path==='/style.css')){res.writeHead(200,{'Content-Type':path.endsWith('.js')?'text/javascript':'text/css'});res.end(readFileSync(`apps/web${path}`));return;}
  if(req.method==='GET'&&path==='/api/state'){send(200,{mode:'fixture',planner:'scripted',signer:false,chainVerified:false,policy:db.policy(),budget:db.budget(),purchases:db.all()});return;}
  const match=path.match(/^\/api\/purchases\/([a-zA-Z0-9_-]{1,80})(\/evidence)?$/);
  if(req.method==='GET'&&match){send(200,match[2]?db.evidence(match[1]!):db.get(match[1]!));return;}
  if(req.method!=='POST'){send(404,{code:'NOT_FOUND'});return;}
  let bytes=0;const chunks:Buffer[]=[];for await(const chunk of req){bytes+=chunk.length;if(bytes>8192){send(413,{code:'BODY_TOO_LARGE'});req.destroy();return;}chunks.push(chunk);}
  const body=JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
  if(path==='/api/near-inspect'){
   if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).join(',')!=='accountId'||!validAccount((body as {accountId:unknown}).accountId)){send(400,{code:'INVALID_ACCOUNT_ID'});return;}
   if(inspectionBusy||Date.now()-lastInspection<30_000){send(429,{code:'READ_ONLY_COOLDOWN'});return;}
   inspectionBusy=true;lastInspection=Date.now();latestInspection=null;try{latestInspection=await inspectAccount((body as {accountId:string}).accountId,liveRpc);send(200,latestInspection);}catch(e){send(503,{code:e instanceof Error?e.message:'RPC_UNAVAILABLE'});}finally{inspectionBusy=false;}return;
  }
  if(path==='/api/near-preflight'){if(!latestInspection){send(409,{code:'LIVE_OBSERVATION_REQUIRED'});return;}try{send(200,{...checkScope(latestInspection,body),observationAcquisition:'SERVER_LIVE_RPC'});}catch(e){send(400,{code:e instanceof Error?e.message:'INVALID_PREFLIGHT'});}return;}
  if(path==='/api/purchases'){send(200,db.propose(body));return;}
  if(path==='/api/policy'){send(200,db.updatePolicy(body));return;}
  if(match&&!match[2]){send(200,db.action(match[1]!,body));return;}
  send(404,{code:'NOT_FOUND'});
 }catch(e){if(e instanceof GuardError)send(409,{code:e.code});else if(e instanceof SyntaxError)send(400,{code:'INVALID_JSON'});else{send(503,{code:'UNAVAILABLE'});}}
}).listen(port,'127.0.0.1',()=>console.log(`IntentGuard LOCAL FIXTURE at ${origin}; no funds moved`));
