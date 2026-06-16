import "./env.js";

/**
 * Turnkey Easebuzz bridge for DollerpayX.
 *
 * The lender runs THIS server on a host of their choice. It holds the Easebuzz
 * merchant key/salt (DollerpayX never sees them) and exposes the standard
 * DollerpayX bridge contract:
 *
 *   POST /wp-json/bosspay/v1/collect   → mints the Easebuzz UPI intent
 *   GET  /wp-json/bosspay/v1/status/:id → Transaction (retrieve) API
 *   GET  /wp-json/bosspay/v1/health    → liveness + enabled PGs
 *   POST /easebuzz/webhook             → verifies + forwards Easebuzz S2S webhook
 *
 * Configure in DollerpayX admin:
 *   PG type        = easebuzz
 *   wp_base_url    = https://<this-host>
 *   bridge_secret  = <BOSSPAY_BRIDGE_SECRET below>
 *
 * Configure in the Easebuzz dashboard (Account Settings → Webhook →
 * Transaction Webhook):
 *   https://<this-host>/easebuzz/webhook
 */

import express from 'express';
import {
  createBossPayBridge,
  createEasebuzzHandlers,
  handleEasebuzzWebhook,
  MemoryTxnStore,
  toExpress,
  type BridgeHandlers,
  type EasebuzzEnv,
} from '@dpx/bridge-node';

const PORT = Number(process.env.PORT ?? 3000);
const BRIDGE_SECRET = process.env.BOSSPAY_BRIDGE_SECRET;
const API_BASE = process.env.BOSSPAY_API_BASE ?? 'https://api.bosspay24.com';
const EASEBUZZ_KEY = process.env.EASEBUZZ_KEY;
const EASEBUZZ_SALT = process.env.EASEBUZZ_SALT;
const EASEBUZZ_ENV: EasebuzzEnv = process.env.EASEBUZZ_ENV === 'test' ? 'test' : 'prod';

if (!BRIDGE_SECRET) {
  console.error('Missing BOSSPAY_BRIDGE_SECRET env var (the shared DollerpayX bridge secret).');
  process.exit(1);
}
if (!EASEBUZZ_KEY || !EASEBUZZ_SALT) {
  console.error('Missing EASEBUZZ_KEY / EASEBUZZ_SALT env vars.');
  process.exit(1);
}

const handlers: BridgeHandlers = {
  easebuzz: createEasebuzzHandlers({
    key: EASEBUZZ_KEY,
    salt: EASEBUZZ_SALT,
    env: EASEBUZZ_ENV,
  }),
};

const txnStore = new MemoryTxnStore();

const bridge = createBossPayBridge({
  bridgeSecret: BRIDGE_SECRET,
  bosspayApiBase: API_BASE,
  handlers,
  txnStore,
  version: '1.0.0',
});

const bridgeHandler = toExpress({
  ctx: { handlers, txnStore, bosspayApiBase: API_BASE, version: '1.0.0' },
  bridgeSecret: BRIDGE_SECRET,
});

const app = express();

app.get('/', (_req, res) => {
  res.json({ ok: true, service: 'dollerpayx-easebuzz-bridge', env: EASEBUZZ_ENV });
});

// Raw bodies for bridge HMAC verification (must run before bridgeHandler).
app.use((req, res, next) => {
  const isBridgeRoute = req.path.includes('/bosspay/v1/');
  const isEasebuzzWebhook = req.path === '/easebuzz/webhook';

  if (isEasebuzzWebhook) {
    express.urlencoded({ extended: true, limit: '1mb' })(req, res, next);
  } else if (isBridgeRoute) {
    express.raw({ type: '*/*', limit: '1mb' })(req, res, next);
  } else {
    next();
  }
});

app.use((req, res, next) => {
  if (req.path.includes('/bosspay/v1/')) {
    return bridgeHandler(req, res, next);
  }
  next();
});

// Easebuzz S2S webhook (form-encoded). Verified with the reverse hash, then
// forwarded to DollerpayX. Returns 400 on a hash mismatch so Easebuzz retries.
app.post('/easebuzz/webhook', async (req, res) => {
    const payload: Record<string, string> = {};
    for (const [k, v] of Object.entries(req.body ?? {})) {
      payload[k] = typeof v === 'string' ? v : String(v ?? '');
    }
    try {
      const result = await handleEasebuzzWebhook(payload, {
        salt: EASEBUZZ_SALT,
        forwardCallback: (args) => bridge.forwardCallback(args),
      });
      res.json({ ok: true, ...result });
    } catch (err) {
      console.error(
        JSON.stringify({
          event: 'easebuzz_webhook_error',
          error: err instanceof Error ? err.message : String(err),
        }),
      );
      res.status(400).json({ ok: false, error: err instanceof Error ? err.message : String(err) });
    }
});

app.listen(PORT, () => {
  console.log(`dollerpayx-easebuzz-bridge listening on :${PORT} (env=${EASEBUZZ_ENV})`);
});
