# Fitness White-Label Template

Independent student template. Never connect to the author's existing databases,
bots, payment shops or hosting. Do not copy env files, account data or client media.

- Node 22+, JavaScript/HTML/CSS, one app for web/telegram/hybrid.
- Keep private keys server-only. Browser state never authorizes access.
- Paid access and account ownership are checked on the server and with RLS.
- Demo is a separate loopback-only process, not a production auth bypass.
- Test first. Run npm test, database and local Auth integration checks before packaging.
- Build transfer ZIP from an explicit policy; never archive the working tree wholesale.
- No cloud migration, real payment or publication without the owner's confirmation.
- Follow docs/IMPLEMENTATION.md for task progress and rulings.
