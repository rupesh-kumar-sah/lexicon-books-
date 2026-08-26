# OpenWA transactional WhatsApp notifications

Lexicon Books supports **optional, consent-based transactional WhatsApp notifications** through a separately hosted OpenWA gateway. The application is deliberately shipped with `OPENWA_ENABLED=false`; no outbound WhatsApp request is attempted until a gateway URL, API key, and paired session ID have all been configured on the application server. OpenWA is a self-hosted, unofficial WhatsApp automation interface, so the operator—not the application—accepts responsibility for sender-account compliance and availability.[1]

## Scope implemented in this release

| Event | Recipient | Consent requirement | Delivery behavior |
|---|---|---:|---|
| New order received | Dedicated configured administrator recipient | No customer opt-in required | Sent only if the gateway is enabled and the dedicated admin recipient is configured. |
| Order received | Customer | Explicit checkout opt-in | Suppressed unless the signed-in user opted in for the same delivery phone. |
| Processing, shipped, delivered, cancelled | Customer | Explicit active opt-in | Sent after the status transaction commits, with a durable notification record preventing duplicate delivery attempts. |
| Customer opt-out | Customer | Authenticated account action | The user can disable future updates for a phone used on one of their own orders from **Your Account**. |

The checkout consent box is **unchecked by default**. A phone number on its own is not consent. This reflects the requirement to obtain opt-in before sending business-initiated WhatsApp messages and to honor withdrawal of consent.[2]

## Host the gateway separately

Do **not** run OpenWA inside the Lexicon Books free Render web service. Use an always-on private VM or container with persistent storage, a protected HTTPS endpoint, and monitoring. The gateway must be able to preserve its paired sender session across restarts. Restrict inbound access to the Lexicon Books application server or a private network where possible. Do not publish the gateway dashboard, pairing QR code, session data, or API key.

1. Deploy and harden OpenWA on the dedicated host following its official self-hosted documentation.[1]
2. Pair a dedicated business sender that the operator is authorized to use. Do not pair a personal number without the owner’s explicit approval.
3. Configure a strong gateway API key and a TLS-protected base URL that ends in `/api`.
4. Confirm that the paired session ID can send a single test message **only after explicit operator approval**.
5. Monitor the gateway process, disk/session persistence, API errors, and sender-account health. The Lexicon Books app records notification status, but it is not a queue worker or a gateway-monitoring replacement.

## Application configuration

Set all values through Render’s protected environment configuration; never commit a production value. Keep the integration disabled until every required setting has been checked.

| Variable | Required before enabling | Meaning |
|---|---:|---|
| `OPENWA_ENABLED` | Yes | Must be exactly `true` to permit any attempt to send. Otherwise the adapter returns immediately. |
| `OPENWA_BASE_URL` | Yes | Private gateway base URL, including `/api`; no credential belongs in the URL. |
| `OPENWA_API_KEY` | Yes | Server-only gateway API key, transmitted in the `X-API-Key` request header. |
| `OPENWA_SESSION_ID` | Yes | Paired OpenWA sender session identifier. |
| `OPENWA_ADMIN_RECIPIENT` | Optional | Dedicated Nepal administrator recipient in `98XXXXXXXX` or `97798XXXXXXXX` format. |

After setting the values, deploy the application and check `GET /api/health`. It reports only non-secret readiness flags under `integrations.openWa`; it never returns the gateway URL, key, session identifier, or recipient number.

## Safe activation procedure

1. Leave `OPENWA_ENABLED=false` while the separate gateway is installed and paired.
2. Verify the health endpoint reports `enabled: false` and `configured: false` or `configured: false` if values are intentionally incomplete.
3. Add the protected values in Render. Ensure the configured admin recipient is a dedicated authorized recipient.
4. Ask the operator for explicit approval for one controlled live sender test. Without that approval, do not send a WhatsApp message.
5. After the approved gateway test succeeds, set `OPENWA_ENABLED=true`, deploy, and verify the health endpoint reports `configured: true`.
6. Place no artificial production order. Wait for a genuine customer who actively selects the checkout opt-in, then monitor the durable `whatsapp_notifications` status record and gateway logs without recording message content.

A failed gateway request is recorded as failed and does not roll back a completed checkout or a completed order-status update. Repeated attempts for the same order, notification kind, and recipient are deduplicated by a database uniqueness constraint.

## Not included yet

This release does **not** accept inbound WhatsApp webhooks, interpret reply text, or route customer/admin messages to AI. The customer opt-out path is implemented through the signed-in account rather than an inbound `STOP` command. AI-assisted replies remain deferred until an actual AI provider is configured, data-minimization and human-escalation rules are approved, inbound webhook signatures are verified, and message IDs are deduplicated.[3]

## Capacity and reliability boundary

The current free Render app remains a staging deployment. It cannot provide a 200,000-concurrent-user guarantee or a durable background-delivery guarantee. Production-scale messaging needs paid multi-instance application hosting, a durable job queue, managed PostgreSQL with appropriate pooling, observability, load testing, and a monitored dedicated gateway. Render documents that free services can spin down and operate with constrained scaling, so it is unsuitable as the availability foundation for this gateway workflow.[4]

## References

[1]: https://docs.openwa.dev/ "OpenWA documentation"
[2]: https://developers.facebook.com/docs/whatsapp/overview/getting-opt-in/ "Meta: Getting opt-in"
[3]: https://developers.facebook.com/docs/graph-api/webhooks/getting-started "Meta: Webhooks getting started"
[4]: https://render.com/docs/free "Render free instance documentation"
