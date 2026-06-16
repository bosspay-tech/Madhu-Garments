import { config as loadEnv } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const bridgeRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
loadEnv({ path: join(bridgeRoot, ".env") });
