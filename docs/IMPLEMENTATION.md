# SDD ledger — plan: 2026-10-26-student-whitelabel-hybrid

Approved: hybrid Web + Telegram; Web YooKassa/RUB, Telegram Stars/XTR;
native implementation with one independent final security review.

## Pre-flight

- Tasks 1→3: RuntimeConfig and principal are shared; keep UUID ownership and server-only mode.
- Tasks 2→3: identity allocation needs a durable reservation; do not derive ownership from email or client metadata.
- Tasks 2→5→6: payments share UUID and atomic grants; provider charge IDs are strings, not assumed UUIDs.
- Tasks 3→4: Telegram Web may block cookies; private data/media must support bearer requests.
- Tasks 4→8: no source/client media or production endpoints in the transferable package.
- Ruling: no source repository has Git; use this approved separate directory and a ledger, not Git-only skill helpers. Cost: no commit-based review; reviewer gets a file manifest and tests.
- Ruling: source projects are read-only. Reuse audited units by selective copying and explicit transformations, never env/cloud bindings/CMS data.

## Tasks

- Task 1: complete — npm test: 4/4 pass; configuration rejects invalid modes/origins and strips private settings; unconfigured API stays 503.
- Task 2: complete — npm test 5/5; isolated PostgreSQL 17 assertions passed for owner isolation, expiry preservation, idempotent grants, identity leases, explicit linking, nonce replay/conflict and bans.
- Task 3: complete backend verification — 10/10 unit/HTTP checks; real isolated Supabase Auth passed email/password, Telegram exchange, refresh, stable UUID, explicit linking and no automatic paid entitlement. Browser form acceptance remains part of Task 4/8.
- Task 4: complete within local scope — shared UI, own recipe atlases/3 labelled MP4; browser acceptance includes onboarding, manual workout, decoding, set edit/back/resume, food/water reload persistence, recipes/favorites/back and separate owners. Widths 320/360/390/430 and desktop checked; real devices remain owner acceptance.
- Task 5: complete within local scope — real HTTP/Auth/REST/SQL billing passed with fake providers: duplicates, wrong amount/owner, shared Stars/Web UUID and separate currencies. No real payment requested.
- Task 6: complete within local scope — own grammY webhook, explicit linking, protected admin/plan/content routes and setup-only admin grant. No live webhook registered or messages sent.
- Task 7: complete — loopback demo, offline doctor, no-overwrite setup, rebuilt Docker image and network-isolated container HTTP smoke passed. Setup/content/auth/payment/backup/handoff guides included.
- Task 8: code and review complete — 43/43 tests; independent final security re-review has no remaining blockers. Actual local Storage upload/RPC/read/denial integration passed. Final ZIP is built from explicit policy and verified through clean extraction; per-file hashes and archive SHA are external sidecars to avoid self-referential digests. See ACCEPTANCE for verified scope and real-service limitations.

## Rulings

- Task 2: use a fresh initdb cluster inside the disposable Docker image, not the image's preconfigured Auth schema — its postgres role does not own that schema. No existing container/database touched.
- Task 2: older/partial refund requires explicit review; a refund must not revoke a later independently paid period. Latest full refund removes only its unused extension, preserves progress. Cost: operator reconciliation for ambiguous histories.
- Task 3: email signup/recovery use the browser SDK PKCE flow after server preflight; otherwise a server-created verifier cannot be exchanged by the browser. Only a short-lived PKCE verifier is shared across tabs; refresh/session data stays in session storage. Cost: restoring a link in a different browser requires requesting it there.
- Task 4: reuse the standalone account/data engine and merge current fitness-only functions through an AST transform; preserve standalone authentication/synchronization adapters. Final package contains materialized code, never a dependency on neighboring source directories. Actual browser regressions and source comparison are required before acceptance.
- Task 4: generic account/media/proof adapters validate the configured backend, not legacy client project IDs. Proof RPCs are selectively reused without the original incompatible admin schema. Unsupported external integrations and destructive progress reset are hidden and documented.
- Review: forward migration 007 adds DB legal readiness/current-consent enforcement and terminal refund-before-success handling; Stars refund pairs and fair worker rotation are covered by tests. Shared logout retains an owner cleanup journal until private IndexedDB cleanup succeeds.
- Dependencies: upgraded Supabase JS from 2.45.4 to pinned 2.118.0 after npm audit identified the old auth-js advisory. Real local integration passed with the upgraded SDK; production dependency audit then reported 0 vulnerabilities.
- Final review: task actions use only durable proof receipts; legacy direct-insert fallback removed. Peer-tab storage events are decoded only within the exact installation/owner prefix. Real Storage integration covers upload, idempotent submit, private read, cross-owner/overwrite/delete denial and legal-version expiry. Demo food portions are required by catalog validation; failed catalog loading leaves manual food entry available.
