# Admin Device Policy Change

The Lexicon Books admin login no longer accepts the Samsung F23 device signal. It now requires a Dell laptop signal, a Windows platform signal, and a Chrome browser signal, together with the existing admin role, location, GeoIP, and rotating-session controls.

## Changed areas

| Area | Change |
|---|---|
| Backend | Replaced Samsung F23 matching with Dell + Windows + Chrome matching in `server/routes/auth.ts`. Edge, Opera, Firefox, and Firefox iOS signals are rejected. |
| Admin UI | Removed the development bypass and changed the login guidance and reset copy to Dell laptop + Chrome. The client sends a `Dell Laptop` label with the real User-Agent and available Client-Hints. |
| Tests | Updated admin verification, JWT/GeoIP, messages, CRUD-hardening, and legacy smoke-test fixtures. Added a non-Chrome rejection case. |
| Reusable security skill | Updated the device-policy guidance and checklist under `/home/ubuntu/skills/lexicon-books-admin-security/SKILL.md`. |

## Verification

The final checks passed the TypeScript compiler, Vite production build, Dell laptop Chrome and geolocation admin regression, health endpoint check (`200`), unauthenticated admin API check (`401`), and whitespace validation. The complete updated regression suite also passed JWT rotation/GeoIP, contact-message CRUD, and CRUD-hardening tests.

## Security note

Desktop Chrome does not normally expose the laptop manufacturer in its standard User-Agent. The browser client therefore supplies the configured Dell signal alongside the actual browser signal. User-Agent and client-provided device labels are spoofable defense-in-depth indicators, not cryptographic proof of hardware identity. For stronger assurance, add MFA, passkeys, or a server-managed device enrollment token.
