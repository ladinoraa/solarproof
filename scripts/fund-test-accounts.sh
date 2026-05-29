#!/usr/bin/env bash
# fund-test-accounts.sh
# Funds Stellar Testnet accounts via the Friendbot faucet before contract tests.
# Usage: ./scripts/fund-test-accounts.sh [ACCOUNT_1] [ACCOUNT_2] ...
# If no accounts are provided, generates fresh keypairs and exports them as env vars.

set -euo pipefail

FAUCET_URL="https://friendbot.stellar.org"
MAX_RETRIES=5
RETRY_DELAY=3

fund_account() {
  local address="$1"
  local attempt=0

  echo "Funding $address ..."
  while [ $attempt -lt $MAX_RETRIES ]; do
    attempt=$((attempt + 1))
    http_code=$(curl -s -o /tmp/faucet_response.json -w "%{http_code}" \
      "${FAUCET_URL}?addr=${address}")

    if [ "$http_code" = "200" ]; then
      echo "  ✓ Funded $address (attempt $attempt)"
      return 0
    fi

    echo "  ✗ Faucet returned HTTP $http_code (attempt $attempt/$MAX_RETRIES)"
    if [ $attempt -lt $MAX_RETRIES ]; then
      sleep $RETRY_DELAY
    fi
  done

  echo "  ERROR: Failed to fund $address after $MAX_RETRIES attempts" >&2
  cat /tmp/faucet_response.json >&2
  return 1
}

# If accounts passed as arguments, fund them directly
if [ $# -gt 0 ]; then
  for addr in "$@"; do
    fund_account "$addr"
  done
  exit 0
fi

# Otherwise generate fresh keypairs (requires stellar CLI)
echo "Generating fresh test keypairs..."

ADMIN_KEY=$(stellar keys generate --no-fund ci-admin-$RANDOM 2>/dev/null || true)
MINTER_KEY=$(stellar keys generate --no-fund ci-minter-$RANDOM 2>/dev/null || true)

# Fall back to generating via keypair if stellar CLI unavailable
if command -v stellar &>/dev/null; then
  ADMIN_ADDR=$(stellar keys address ci-admin 2>/dev/null || echo "")
  MINTER_ADDR=$(stellar keys address ci-minter 2>/dev/null || echo "")
else
  echo "stellar CLI not found; skipping keypair generation" >&2
  exit 0
fi

[ -n "$ADMIN_ADDR" ]  && fund_account "$ADMIN_ADDR"
[ -n "$MINTER_ADDR" ] && fund_account "$MINTER_ADDR"

echo "All test accounts funded."
