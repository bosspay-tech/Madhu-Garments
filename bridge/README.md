# DollerpayX — Easebuzz bridge

A turnkey, single-purpose bridge that connects an **Easebuzz** merchant account
to the DollerpayX orchestration platform. It runs on a host **you** (the lender)
control, holds your Easebuzz `key`/`salt`, mints the UPI-intent deeplink, answers
status checks, and forwards the Easebuzz webhook to DollerpayX.

DollerpayX never receives your Easebuzz credentials — only `bridge_secret` (a
shared HMAC secret) and this server's public URL.

## How it works

```
Customer  ──collect──▶  DollerpayX backend  ──HMAC POST──▶  THIS bridge
                                                              │
                                            1. POST /payment/initiateLink     → access_key
                                            2. POST /webservice/submitInitiatePayment/ → upi://pay?...
                                                              │
DollerpayX checkout ◀── upi_intent_url (qr_link) ────────────┘

Customer pays in UPI app
        │
Easebuzz ──webhook (form POST)──▶  POST /easebuzz/webhook  (reverse-hash verified)
                                            │ HMAC-signed
                                            ▼
                              DollerpayX  POST /callbacks/easebuzz/:txnId
```

- **Collect** mints the `upi://pay?...` intent synchronously and returns it as
  `upi_intent_url`, so DollerpayX classifies this PG as
  `collection_url_type: deeplink` — the customer lands on the standard
  DollerpayX-hosted checkout, never on a raw Easebuzz URL.
- **Status** uses the Easebuzz Transaction (retrieve) API.
- **Webhook** is the authoritative completion signal. Verified with the
  Easebuzz reverse hash, then forwarded to DollerpayX.

## Setup

1. **Install** (the `@dpx/bridge-node` tarball ships alongside this folder):

   ```bash
   npm install
   npm run build
   ```

2. **Configure** — copy `.env.example` to `.env` and fill it in:

   ```bash
   cp .env.example .env
   ```

   | var | meaning |
   |-----|---------|
   | `BOSSPAY_BRIDGE_SECRET` | shared HMAC secret — paste the same value into DollerpayX admin |
   | `BOSSPAY_API_BASE` | DollerpayX API base (default `https://api.dpxreal.com`) |
   | `EASEBUZZ_KEY` / `EASEBUZZ_SALT` | your Easebuzz merchant credentials |
   | `EASEBUZZ_ENV` | `prod` (live) or `test` (sandbox) |

3. **Run** (behind HTTPS — e.g. a reverse proxy / PaaS):

   ```bash
   node --env-file=.env dist/server.js
   ```

4. **Register in DollerpayX admin** → PGs → add PG:
   - PG type = `easebuzz`
   - `wp_base_url` = `https://<this-host>`
   - `bridge_secret` = the value of `BOSSPAY_BRIDGE_SECRET`

5. **Register the webhook in Easebuzz** (Account Settings → Webhook →
   Transaction Webhook):
   - `https://<this-host>/easebuzz/webhook`

## Endpoints

| route | purpose |
|-------|---------|
| `POST /wp-json/bosspay/v1/collect` | mint the UPI intent (HMAC) |
| `GET  /wp-json/bosspay/v1/status/:id` | retrieve transaction status (HMAC) |
| `GET  /wp-json/bosspay/v1/health` | liveness + enabled PGs (HMAC) |
| `POST /easebuzz/webhook` | Easebuzz S2S webhook (reverse-hash verified) |

## Notes

- This starter uses an in-memory txn store. For multi-instance / restart-durable
  deployments swap `MemoryTxnStore` for `SupabaseTxnStore` (see the other
  starters in the Node handoff). The webhook path is stateless and always
  authoritative regardless of the store.
- All amounts on the DollerpayX wire are **paisa**; this bridge converts to
  Easebuzz rupee strings at the boundary.
