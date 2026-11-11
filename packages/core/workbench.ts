import { createHash } from 'node:crypto';
import Database from 'better-sqlite3';
import { existsSync } from 'node:fs';

export const MODE = 'fixture' as const;
export const SERVICE = 'near-permission-report-v1';
export const PAYEE = 'merchant.testnet';
export class GuardError extends Error { constructor(public code: string) { super(code); } }
export const fail = (code: string): never => { throw new GuardError(code); };
export function amount(value: unknown): bigint {
  if (typeof value !== 'string' || !/^(0|[1-9][0-9]{0,37})$/.test(value)) return fail('INVALID_AMOUNT');
  return BigInt(value);
}
export function object(value: unknown, keys: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fail('INVALID_OBJECT');
  const v = value as Record<string, unknown>;
  if (Object.keys(v).sort().join('|') !== [...keys].sort().join('|')) return fail('UNEXPECTED_FIELDS');
  return v;
}
export const digest = (value: unknown): string => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export interface Policy { revision: number; perTx: string; daily: string; paused: boolean; }
export interface Request { id: string; target: string; service: string; network: string; maximumPriceYocto: string; reason: string; }
export interface Purchase { id: string; request: Request; requestHash: string; policy: Policy; state: 'DENIED'|'NEEDS_APPROVAL'|'RESERVED'|'UNKNOWN'|'SIMULATED_SETTLED'|'CANCELLED'; reasonCode: string; amount: string; payee: string; createdAt: string; settledDay: string|null; }
const PRICE = '100000000000000000000';
export function parseRequest(v: unknown): Request {
  const r = object(v, ['id','target','service','network','maximumPriceYocto','reason']);
  if (typeof r.id !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(r.id)) return fail('INVALID_ID');
  if (typeof r.target !== 'string' || r.target.length < 2 || r.target.length > 64 || !/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/.test(r.target)) return fail('INVALID_ACCOUNT');
  if (r.service !== SERVICE || r.network !== 'testnet') return fail('UNSUPPORTED_SERVICE_OR_NETWORK');
  amount(r.maximumPriceYocto);
  if (typeof r.reason !== 'string' || r.reason.length > 500) return fail('INVALID_REASON');
  return r as unknown as Request;
}
export function requestHash(r: Request): string { return digest(['ig-local-request-v1',r.id,'fixture-owner','fixture-payer.testnet',r.network,r.service,r.target,r.maximumPriceYocto]); }
export function policyHash(p: Policy): string { return digest(['ig-local-policy-v1',p.revision,p.perTx,p.daily,p.paused,PAYEE,PRICE]); }
const STATES = ['DENIED','NEEDS_APPROVAL','RESERVED','UNKNOWN','SIMULATED_SETTLED','CANCELLED'];
function validPolicy(p: Policy) { object(p,['revision','perTx','daily','paused']);if(!Number.isSafeInteger(p.revision)||p.revision<1||typeof p.paused!=='boolean'||amount(p.perTx)>amount(p.daily))fail('INVALID_POLICY'); }
function validDay(day: unknown): boolean {return typeof day==='string' && /^\d{4}-\d{2}-\d{2}$/.test(day) && Number.isFinite(Date.parse(day+'T00:00:00.000Z')) && new Date(day+'T00:00:00.000Z').toISOString().slice(0,10)===day;}
function validPurchase(p: Purchase) {
 object(p,['id','request','requestHash','policy','state','reasonCode','amount','payee','createdAt','settledDay']);
 parseRequest(p.request);validPolicy(p.policy);
 const reasons:Record<string,string[]>={DENIED:['PAUSED','PRICE_ABOVE_MAXIMUM','DAILY_LIMIT'],NEEDS_APPROVAL:['MANUAL_APPROVAL_REQUIRED'],RESERVED:['POLICY_ALLOWED'],UNKNOWN:['SIMULATED_UNKNOWN_OUTCOME'],SIMULATED_SETTLED:['FIXTURE_ONLY_NO_TRANSACTION'],CANCELLED:['LOCAL_CANCELLED']};
 if (!STATES.includes(p.state) || !reasons[p.state]?.includes(p.reasonCode) || p.id !== p.request.id || typeof p.createdAt!=='string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(p.createdAt) || !Number.isFinite(Date.parse(p.createdAt)) || new Date(p.createdAt).toISOString()!==p.createdAt || (p.state === 'SIMULATED_SETTLED' ? !validDay(p.settledDay) : p.settledDay !== null) || p.amount!==PRICE || p.payee!==PAYEE || p.requestHash!==requestHash(p.request)) fail('INVALID_PURCHASE');
}
const active = (p: Purchase) => p.state === 'RESERVED' || p.state === 'UNKNOWN';
export class Workbench {
  db: Database.Database;
  constructor(path: string, options: { initialize?: boolean; now?: ()=>Date } = {}) {
    this.now = options.now ?? (()=>new Date());
    if (path !== ':memory:' && !existsSync(path) && !options.initialize) fail('LEDGER_MISSING');
    this.db = new Database(path);
    try {
    this.db.pragma('foreign_keys=ON');this.db.pragma('busy_timeout=5000');this.db.pragma('journal_mode=WAL');
    if (options.initialize) {
      this.db.exec('CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY,value TEXT NOT NULL); CREATE TABLE IF NOT EXISTS purchases (id TEXT PRIMARY KEY, body TEXT NOT NULL); CREATE TABLE IF NOT EXISTS events (seq INTEGER PRIMARY KEY, body TEXT NOT NULL, previous TEXT NOT NULL, hash TEXT NOT NULL);');
      this.db.prepare('INSERT OR IGNORE INTO meta VALUES (?,?)').run('schema','1');
      this.db.prepare('INSERT OR IGNORE INTO meta VALUES (?,?)').run('policy',JSON.stringify({revision:1,perTx:PRICE,daily:'300000000000000000000',paused:false}));
    }
    if ((this.db.prepare('SELECT value FROM meta WHERE key=?').get('schema') as {value:string}|undefined)?.value !== '1') fail('INVALID_LEDGER_SCHEMA');
    if ((this.db.pragma('quick_check') as {quick_check:string}[])[0]?.quick_check !== 'ok') fail('LEDGER_CORRUPT');
    this.db.transaction(()=>this.validate()).deferred();
    } catch(error) {
      // Failed construction must not retain a SQLite/WAL handle, especially on Windows.
      try { this.db.close(); } catch { /* Preserve the original validation failure. */ }
      throw error;
    }
  }
  now: ()=>Date;
  close() { this.db.close(); }
  policy(): Policy { const row=this.db.prepare('SELECT value FROM meta WHERE key=?').get('policy') as {value:string}; const p=JSON.parse(row.value) as Policy; validPolicy(p);return p; }
  all(): Purchase[] { return (this.db.prepare('SELECT body FROM purchases ORDER BY rowid DESC').all() as {body:string}[]).map(x=>JSON.parse(x.body) as Purchase); }
  get(id: string): Purchase { const x=this.db.prepare('SELECT body FROM purchases WHERE id=?').get(id) as {body:string}|undefined;if(!x)fail('NOT_FOUND');return JSON.parse(x!.body) as Purchase; }
  save(p: Purchase) { this.db.prepare('INSERT INTO purchases VALUES (?,?) ON CONFLICT(id) DO UPDATE SET body=excluded.body').run(p.id,JSON.stringify(p)); }
  event(type: string, data: unknown) { const previous=(this.db.prepare('SELECT hash FROM events ORDER BY seq DESC LIMIT 1').get() as {hash:string}|undefined)?.hash??'GENESIS';const body=JSON.stringify({type,data,at:this.now().toISOString(),mode:MODE});const hash=digest(['ig-local-event-v1',previous,body]);this.db.prepare('INSERT INTO events(body,previous,hash) VALUES(?,?,?)').run(body,previous,hash); }
  validate() { let prev='GENESIS';const latest=new Map<string,Purchase>();let lastPolicy:Policy|undefined;
    for(const e of this.db.prepare('SELECT body,previous,hash FROM events ORDER BY seq').all() as {body:string;previous:string;hash:string}[]) {
      if(e.previous!==prev||e.hash!==digest(['ig-local-event-v1',prev,e.body]))fail('AUDIT_CORRUPT');prev=e.hash;
      const event=JSON.parse(e.body) as {type:string;data:Purchase|Policy;mode:string};if(event.mode!==MODE)fail('AUDIT_CORRUPT');
      if(event.type==='POLICY_UPDATED')lastPolicy=event.data as Policy;
      else if(event.type==='PROPOSED'||event.type==='LOCAL_ACTION'){const p=event.data as Purchase;validPurchase(p);latest.set(p.id,p);}else fail('AUDIT_CORRUPT');
    }
    const policy=this.policy();if(JSON.stringify(policy)!==JSON.stringify(lastPolicy??{revision:1,perTx:PRICE,daily:'300000000000000000000',paused:false}))fail('POLICY_AUDIT_MISMATCH');
    for(const row of this.db.prepare('SELECT id,body FROM purchases').all() as {id:string;body:string}[]){if(row.id!==(JSON.parse(row.body) as Purchase).id)fail('PURCHASE_KEY_MISMATCH');}
    const purchases=this.all();if(latest.size!==purchases.length)fail('PURCHASE_AUDIT_MISMATCH');
    for(const p of purchases){validPurchase(p);if(p.requestHash!==requestHash(parseRequest(p.request))||p.payee!==PAYEE||p.amount!==PRICE||JSON.stringify(latest.get(p.id))!==JSON.stringify(p))fail('LEDGER_CORRUPT');}
  }
  budget() { const day=this.now().toISOString().slice(0,10);let spent=0n,pending=0n;for(const p of this.all()){if(active(p))pending+=amount(p.amount);if(p.state==='SIMULATED_SETTLED'&&p.settledDay===day)spent+=amount(p.amount);}return {day,spent:spent.toString(),pending:pending.toString(),limit:this.policy().daily}; }
  updatePolicy(input: unknown): Policy {const x=object(input,['expectedRevision','perTx','daily','paused']);const perTx=amount(x.perTx),daily=amount(x.daily);if(perTx>daily||typeof x.paused!=='boolean')fail('INVALID_POLICY');return this.db.transaction(()=>{const p=this.policy();if(x.expectedRevision!==p.revision)fail('REVISION_CONFLICT');const next:Policy={revision:p.revision+1,perTx:String(perTx),daily:String(daily),paused:x.paused as boolean};this.db.prepare('UPDATE meta SET value=? WHERE key=?').run(JSON.stringify(next),'policy');this.event('POLICY_UPDATED',next);return next;}).immediate(); }
  propose(input: unknown): Purchase {const r=parseRequest(input);return this.db.transaction(()=>{const old=this.db.prepare('SELECT body FROM purchases WHERE id=?').get(r.id) as {body:string}|undefined;if(old){const p=JSON.parse(old.body) as Purchase;if(p.requestHash!==requestHash(r)||p.request.reason!==r.reason)fail('IDEMPOTENCY_CONFLICT');return p;}
      const policy=this.policy();const p:Purchase={id:r.id,request:r,requestHash:requestHash(r),policy,state:'DENIED',reasonCode:'',amount:PRICE,payee:PAYEE,createdAt:this.now().toISOString(),settledDay:null};
      if(policy.paused)p.reasonCode='PAUSED';else if(amount(r.maximumPriceYocto)<amount(PRICE))p.reasonCode='PRICE_ABOVE_MAXIMUM';else if(amount(PRICE)>amount(policy.perTx)){p.state='NEEDS_APPROVAL';p.reasonCode='MANUAL_APPROVAL_REQUIRED';}else this.reserve(p);
      this.save(p);this.event('PROPOSED',p);return p;}).immediate(); }
  reserve(p: Purchase) { const b=this.budget();if(amount(b.spent)+amount(b.pending)+amount(p.amount)>amount(this.policy().daily)){p.state='DENIED';p.reasonCode='DAILY_LIMIT';}else{p.state='RESERVED';p.reasonCode='POLICY_ALLOWED';} }
  action(id:string, input:unknown): Purchase {const x=object(input,['action','requestHash','expectedRevision']);return this.db.transaction(()=>{const p=this.get(id),policy=this.policy();if(x.requestHash!==p.requestHash||x.expectedRevision!==policy.revision)fail('STALE_AUTHORIZATION');
      if(x.action!=='cancel'&&p.policy.revision!==policy.revision)fail('STALE_AUTHORIZATION');
      if(x.action==='cancel'){if(!['NEEDS_APPROVAL','RESERVED'].includes(p.state))fail('CANNOT_CANCEL');p.state='CANCELLED';p.reasonCode='LOCAL_CANCELLED';}
      else {if(policy.paused)fail('PAUSED');if(x.action==='approve'){if(p.state!=='NEEDS_APPROVAL')fail('INVALID_TRANSITION');this.reserve(p);}
      else if(x.action==='unknown'){if(p.state!=='RESERVED')fail('INVALID_TRANSITION');p.state='UNKNOWN';p.reasonCode='SIMULATED_UNKNOWN_OUTCOME';}
      else if(x.action==='simulate'){if(p.state!=='RESERVED')fail('INVALID_TRANSITION');p.state='SIMULATED_SETTLED';p.reasonCode='FIXTURE_ONLY_NO_TRANSACTION';p.settledDay=this.now().toISOString().slice(0,10);}
      else fail('INVALID_ACTION');}
      this.save(p);this.event('LOCAL_ACTION',p);return p;}).immediate(); }
  evidence(id:string) {const p=this.get(id);return {schemaVersion:'ig-local-evidence-v1',executionMode:MODE,plannerMode:'scripted',chainVerified:false,payment:null,purchase:p,requestHash:p.requestHash,policyHash:policyHash(p.policy),purchaseHash:digest(['ig-local-purchase-v1',p]),limitations:['Local fixture only; no wallet authentication or chain execution.','Hashes detect mismatches, not malicious full-record rewrites or host/database rollback.']}; }
}
export function verifyEvidence(v: unknown): string {try {if(!v||typeof v!=='object')return 'INVALID';const e=v as ReturnType<Workbench['evidence']>;const p=e.purchase;validPurchase(p);if(e.schemaVersion!=='ig-local-evidence-v1'||e.executionMode!==MODE||e.plannerMode!=='scripted'||e.chainVerified!==false||e.payment!==null)return 'INVALID';parseRequest(p.request);if(p.requestHash!==requestHash(p.request)||e.requestHash!==p.requestHash||e.policyHash!==policyHash(p.policy)||e.purchaseHash!==digest(['ig-local-purchase-v1',p])||p.payee!==PAYEE||p.amount!==PRICE)return 'INVALID';amount(p.policy.perTx);amount(p.policy.daily);return 'OFFLINE_MATCH';}catch{return 'INVALID';} }
