## November 12 RPC repair and browser verification

The bounded RPC repair adds sanitized transport errors, explicit cooldown timing and manual-retry UX. It does not change the fixed provider, endpoint allowlists, finalized-block pinning or no-signing boundary. Network intermittency was observed; its root cause was not established and no network settings were changed.

Windows Node24.22.1: 66/66 deterministic tests, build, typecheck and frontend syntax checks passed. Thirteen regressions extend the earlier 53-test suite. A relocated npm launcher initially failed; a process-local launcher resolved the test environment issue without changing package scripts. Tests do not establish live reachability.

Real Edge browser clicks on the same-host application returned wrap.testnet LIVE_RPC_OBSERVATION at finalized block 277340858 (2026-11-12T08:54:46.482Z) and 277341239 (08:58:27.640Z). FullAccess, wrong receiver, nonzero deposit and natural expiry were refused. All scope results retained signed=false, executed=false, authorizationGranted=false. Refresh preserved a disabled retry button while countdown changed 8s to 6s. Earlier browser-control transport failures and ineffective pre-refresh clicks preceded this successful run; they are not hidden as successes.

The JSON observations, refusal outputs and cooldown capture are in evidence/windows-20261112/. Hash binding and local diagnostic replay were independently checked within the local test environment; they are not independent cryptographic chain proofs. No positive live bounded FunctionCall-key match, wallet authentication, contract execution, payment or production security certification is claimed.

## Earlier dated verification (preserved)

# Verification and limitations

November11 verification of application SHA 4c37d95d70c3f4a94dd233f78bdffbe2e81ede42: 53 tests passed in Linux and Windows; typecheck/build passed. Tests cover strict schema, integer amounts, replay/concurrency, corrupted database rejection, unknown reservations, RPC validation, scope mismatches and rendering regression. A Windows initialization-error handle leak was fixed without relaxing validation.

Real Chrome → local server → public FASTNEAR testnet RPC completed on November11 04:46:21.482 UTC at finalized block 277167762, hash 2dw8yDh8nJXbn1if18TszuYwLqxzUcE3H4xvKyTkGgVY. The observed FullAccess key was refused as a scoped key. Modified receiver/deposit and natural snapshot expiry were refused; no authorization/signature/execution was granted.

Actual browser checks included invalid input, cooldown, clearing stale judgments, UNKNOWN preservation after restart, evidence download, and viewport widths375/768/1440. Browser tests used an isolated synthetic ledger, not historical customer data. No horizontal page overflow was observed.

These are dated engineering observations, not independent certification, prize eligibility, wallet ownership proof, completed payment integration or production security assurance. A positive live bounded-key match was not demonstrated. Synthetic positive tests are not chain transactions. The public snapshot should be re-tested in the reviewer's environment.
