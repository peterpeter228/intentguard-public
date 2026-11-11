# IntentGuard

A local NEAR security workbench: inspect public testnet account permissions, diagnose an unsigned proposal against narrow deterministic policy, and demonstrate restart-safe budget reservations.

Prepared for **AI Security & Defense** and **Open Innovation**. This is a reviewable prototype, not a production wallet or a submitted/accepted entry.

## Run without credentials

Tested Node 24.22.1 / npm 11.9.0. Install the locked official dependencies:

```sh
npm ci --ignore-scripts
npm test
npm run typecheck
npm run demo:offline
npm run demo:scope
npm run inspect:near -- wrap.testnet
npm run start:init
```

On Windows PowerShell, if the POSIX `start:init` wrapper is unavailable, initialize using:

```powershell
New-Item -ItemType Directory -Force private | Out-Null
node dist/apps/api/server.js --init
```

Open http://127.0.0.1:4173 on the same computer. On subsequent starts use `npm start`, without initialization. Do not expose this fixture server to the internet. The locked SQLite dependency requires a compatible native binary; supported Windows and Linux Node24 environments were tested.

## Demonstration

1. Inspect `wrap.testnet`: the live endpoint reads an account and access keys at one finalized block using a fixed public RPC provider.
2. Preview a public key's scope. The deliberately narrow example policy permits only `wrap.testnet` / `ft_balance_of`, zero deposit, at most 30 Tgas and an observation no older than 120 seconds. A FullAccess key is rejected as a limited agent key, not accused of being malicious.
3. Change receiver or deposit; observe a precise refusal. Expired snapshots require a new observation. Even a match returns only `SCOPE_MATCH_PENDING_OWNER`; nothing signs or executes.
4. In the separate fixture workbench, reserve a fixed synthetic purchase, repeat its id, request local review or simulate an unknown outcome. UNKNOWN keeps its budget reservation across restart.
5. Download evidence and run `npm run evidence:verify -- --file <file.json>`. OFFLINE_MATCH is local consistency only, not payment or chain settlement.

## Scope and trust

All budget purchases and positive bounded-key examples are synthetic and labeled. Public RPC reads are real but rely on the provider, not independently verified state proofs. The local host is trusted. Hash binding does not prevent an attacker rewriting an entire local database. FunctionCall gas allowance is not an asset spending cap. Contract behavior and fee sufficiency are not verified.

There is no wallet authentication, signer, transaction, real payment, agent earnings or deployment. Real bounded FunctionCall-key positive matching remains unverified. The original paid procurement roadmap is incomplete.

## Competition review

Security: conservative scope refusal, exact snapshot/proposal binding, unknown-state lock, replay/concurrency controls, restart-safe evidence.

Open Innovation: a human-reviewable combination of chain capability inspection and a local recoverable budget workbench. This is proposed design value, not proof of novelty or award eligibility. No Agents or Autonomous Business claim is made.

Official rules: https://nearhackathon.com/HACKATHON.md . Public demo video, prize-account compliance and actual submission remain separate unfinished steps.

See [provenance](PROVENANCE.md), [verification](VERIFICATION.md) and [release manifest](release-manifest.json).
