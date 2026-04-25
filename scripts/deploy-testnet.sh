#!/usr/bin/env bash
# Deploy Soroban contracts to Stellar Testnet.
# Idempotent: skips a contract if its address is already in the manifest.
# Outputs: scripts/deployments/testnet.json

set -euo pipefail

NETWORK="testnet"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MANIFEST_DIR="$ROOT/scripts/deployments"
MANIFEST="$MANIFEST_DIR/${NETWORK}.json"
CONTRACTS_DIR="$ROOT/apps/contracts"
CONTRACTS=(energy_token audit_registry community_governance)

: "${DEPLOYER_SECRET_KEY:?DEPLOYER_SECRET_KEY env var is required}"

mkdir -p "$MANIFEST_DIR"
[[ -f "$MANIFEST" ]] || echo '{}' > "$MANIFEST"

echo "==> Building contracts for $NETWORK..."
cd "$CONTRACTS_DIR"
stellar contract build

cd "$ROOT"

for CONTRACT in "${CONTRACTS[@]}"; do
  EXISTING=$(jq -r --arg c "$CONTRACT" '.[$c] // empty' "$MANIFEST")
  if [[ -n "$EXISTING" ]]; then
    echo "==> $CONTRACT already deployed at $EXISTING — skipping"
    continue
  fi

  WASM="$CONTRACTS_DIR/target/wasm32-unknown-unknown/release/${CONTRACT}.wasm"
  echo "==> Deploying $CONTRACT..."
  ADDRESS=$(stellar contract deploy \
    --wasm "$WASM" \
    --source "$DEPLOYER_SECRET_KEY" \
    --network "$NETWORK" \
    2>&1 | tail -1)

  echo "    $CONTRACT => $ADDRESS"
  TMP=$(mktemp)
  jq --arg c "$CONTRACT" --arg a "$ADDRESS" '.[$c] = $a' "$MANIFEST" > "$TMP"
  mv "$TMP" "$MANIFEST"
done

echo ""
echo "==> Deployment manifest saved to $MANIFEST"
cat "$MANIFEST"
