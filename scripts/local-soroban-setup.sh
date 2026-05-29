#!/usr/bin/env bash

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! command -v docker >/dev/null 2>&1; then
  echo "ERROR: Docker is required to run the local Soroban sandbox."
  exit 1
fi

echo "Building Soroban contract WASM artifacts..."
cd apps/contracts
cargo build --release --target wasm32-unknown-unknown -p energy_token
cargo build --release --target wasm32-unknown-unknown -p audit_registry
cd "$ROOT"

echo "Starting local Soroban sandbox container..."
docker pull stellar/quickstart:soroban

if docker ps -a --format '{{.Names}}' | grep -q '^solarproof-soroban$'; then
  docker rm -f solarproof-soroban >/dev/null 2>&1 || true
fi

docker run -d \
  --name solarproof-soroban \
  -p 8000:8000 \
  -p 11626:11626 \
  -v "$ROOT":/repo \
  stellar/quickstart:soroban

echo "Waiting for local Soroban RPC to become healthy..."
until curl -s http://127.0.0.1:8000/health | grep -Eq 'ok|OK|true'; do
  sleep 1
  echo -n '.'
done

echo
printf 'Local Soroban RPC is ready at http://127.0.0.1:8000\n'

echo "Next steps:"
cat <<'EOF'
1. Deploy the contracts from the built WASM artifacts.
   You can use your local stellar CLI or a separate deploy script.
2. Set the following environment vars in apps/web/.env.local:
   NEXT_PUBLIC_AUDIT_REGISTRY_ID
   NEXT_PUBLIC_ENERGY_TOKEN_ID
   MINTER_SECRET_KEY
   NEXT_PUBLIC_SUPABASE_URL
   NEXT_PUBLIC_SUPABASE_ANON_KEY
   SUPABASE_SERVICE_ROLE_KEY
3. Start the Next.js app with `pnpm --filter @solarproof/web dev`.
4. Run the integration test script:
   pnpm exec node scripts/local-soroban-integration.mjs
EOF
