import { config as loadEnv } from "dotenv";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// Local dev only — Coolify injects env vars directly; existing vars are not overridden.
const bridgeRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(bridgeRoot, ".env");
if (existsSync(envPath)) {
  loadEnv({ path: envPath });
}
