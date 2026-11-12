# IntentGuard review guide

This is a project guide, not organizer rules or an eligibility ruling.

## Proposed tracks
AI Security & Defense: narrow fail-closed scope diagnosis, same-finalized-block evidence binding, unknown-outcome reservation lock and explicit refusal reasons. Open Innovation: combines public capability inspection and local restart-safe budget demonstrations. One project, not duplicate entries; organizers decide fit. No Agent Economy or Autonomous Business qualification is claimed.

## Reproduce
Use the Node version pinned in package.json. Run npm ci --ignore-scripts, npm test and npm run typecheck. Run npm run demo:offline and npm run demo:scope for labeled synthetic budget and bounded-key cases. Run npm run inspect:near -- wrap.testnet for live public testnet reads. Initialize a fresh local ledger once with npm run start:init, then use npm start. On Windows use the explicit PowerShell initialization command in README. Never initialize over a historical ledger.

In the browser, read wrap.testnet, preview a FullAccess key and observe denial. Change receiver or deposit for specific refusals. Let the snapshot expire and observe freshness refusal. The fixed example policy allows only wrap.testnet/ft_balance_of, zero deposit and at most 30 Tgas. FullAccess owner keys are normal; rejecting them as agent credentials is not an accusation of maliciousness.

## Boundaries and unfinished work
No wallet authentication, signer, broadcast, real purchase, agent earnings or deployment. Bounded-key positive results are synthetic; real positive matching remains unverified. RPC provider and local host are trusted. Hashes cannot prevent malicious complete local rewriting. Gas allowance is not an asset-loss cap; contracts and fee sufficiency are not audited. The original paid procurement roadmap remains incomplete.

Public demo video/link and final submission receipt are still pending. Prize-account requirements and jurisdiction eligibility must be checked against the organizer's current rules, separately from engineering results. See README's fixed baseline diff, PROVENANCE.md, VERIFICATION.md and LICENSE. Official rules: https://nearhackathon.com/HACKATHON.md .
