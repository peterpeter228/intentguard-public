# Verification and limitations

November11 verification of application SHA 4c37d95d70c3f4a94dd233f78bdffbe2e81ede42: 53 tests passed in Linux and Windows; typecheck/build passed. Tests cover strict schema, integer amounts, replay/concurrency, corrupted database rejection, unknown reservations, RPC validation, scope mismatches and rendering regression. A Windows initialization-error handle leak was fixed without relaxing validation.

Real Chrome → local server → public FASTNEAR testnet RPC completed on November11 04:46:21.482 UTC at finalized block 277167762, hash 2dw8yDh8nJXbn1if18TszuYwLqxzUcE3H4xvKyTkGgVY. The observed FullAccess key was refused as a scoped key. Modified receiver/deposit and natural snapshot expiry were refused; no authorization/signature/execution was granted.

Actual browser checks included invalid input, cooldown, clearing stale judgments, UNKNOWN preservation after restart, evidence download, and viewport widths375/768/1440. Browser tests used an isolated synthetic ledger, not historical customer data. No horizontal page overflow was observed.

These are dated engineering observations, not independent certification, prize eligibility, wallet ownership proof, completed payment integration or production security assurance. A positive live bounded-key match was not demonstrated. Synthetic positive tests are not chain transactions. The public snapshot should be re-tested in the reviewer's environment.
