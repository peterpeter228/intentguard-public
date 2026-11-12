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

## RPC connectivity and tests

`npm test` is deterministic and uses injected responses for RPC transport/error coverage; it does not prove live RPC reachability. Run `npm run inspect:near -- wrap.testnet` separately for a real read-only network check from the server's runtime. A successful check from another runtime does not prove this local server can connect.

The live provider remains fixed at `https://test.rpc.fastnear.com`, with redirects rejected and a 12-second timeout per request. Transport failures show a sanitized explanation and a manual-retry cooldown. The server must have ordinary HTTPS connectivity to that provider. No fallback fixture, cached success, automatic retry, proxy/security reconfiguration, or signing is performed. If connectivity fails, repair the runtime/network separately; a clearer error message is not a network fix.

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

## License

Original project source and documentation are available under the [MIT License](LICENSE), copyright 2026 peterpeter228. Third-party dependencies retain their own licenses; this grant does not relicense them. Dependencies are referenced by the lockfile, not bundled into this repository. Preserve their license/notice requirements when distributing dependency code or built bundles.

## Existing work and competition diff

Review the [fixed preparation-to-application diff](https://github.com/peterpeter228/intentguard-public/compare/96336afbd01a661fa3b3e3b03bcd063589f892bc...e7e91887647501454246779155cd4f085a3d9694) on dedicated branch [review/hackathon-diff-20261111](https://github.com/peterpeter228/intentguard-public/tree/review/hackathon-diff-20261111).

The baseline is an explicitly labeled, sanitized export of five pre-existing files from October26: dependency manifest/lockfile, TypeScript configuration, gitignore and a generic runtime probe. The application directories did not exist at that baseline. New work adds the budget core, API/UI, finalized NEAR inspection, unsigned scope diagnostic, demonstrations and application tests. Dependencies and the retained runtime probe are reused, not claimed as new inventions.

Both comparison commits were exported now; they are not original-date commits. Private history and unshipped private material are intentionally omitted. The compared final tree is byte-identical to public release 07ff4783fa87add4cd024f02f809bfab69f38d90; that fixed comparison predates the November 12 RPC repair. Review the [complete current main delta](https://github.com/peterpeter228/intentguard-public/compare/96336afbd01a661fa3b3e3b03bcd063589f892bc...main) separately; this publication includes the November 12 repair. Official Q-001 permits work from October19, so October26 is our internal preparation baseline within that window, not an official pre-hackathon cutoff. See [detailed provenance](PROVENANCE.md).

## Latest verification and submission status

The November 12 bounded RPC repair passed 66 deterministic tests and real Windows Edge read-only checks. See [verification](VERIFICATION.md) and [review guide](HACKATHON.md). Public X demo video/link, prize-account compliance and organizer submission confirmation remain separate unfinished steps; this document does not claim they have happened.

## Dependencies, reuse and AI assistance

Runtime dependencies are better-sqlite3 13.0.3 (local SQLite persistence) and near-api-js 7.4.0 (retained NEAR SDK dependency). The current live read-only RPC path uses Node native fetch, not near-api-js. Development dependencies are TypeScript 7.0.2, @types/node 24.19.2 and @types/better-sqlite3 9.6.0. Exact transitive dependencies are recorded in package-lock.json and keep their own licenses.

AI assistance was used for development, review and testing. Reused preparation material includes dependency configuration, TypeScript configuration, gitignore and generic runtime probes, as disclosed in PROVENANCE.md. No external application template was used. Reused infrastructure and dependencies are not claimed as novel application work.
