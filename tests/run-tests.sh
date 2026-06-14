#!/bin/bash
# Run specific Playwright E2E test suites
# Usage: ./tests/run-tests.sh [suite]
#   suite: admin | cashier | chef | edge | all (default)

set -e

SUITE="${1:-all}"

echo "=== Burger House E2E Tests ==="
echo "Suite: $SUITE"
echo ""

case "$SUITE" in
  admin)
    npx playwright test --project=admin
    ;;
  cashier)
    npx playwright test --project=cashier
    ;;
  chef)
    npx playwright test --project=chef
    ;;
  edge)
    npx playwright test --project=edge-cases
    ;;
  all)
    npx playwright test --project=admin --project=cashier --project=chef --project=edge-cases
    ;;
  *)
    echo "Unknown suite: $SUITE"
    echo "Usage: ./tests/run-tests.sh [admin|cashier|chef|edge|all]"
    exit 1
    ;;
esac

echo ""
echo "=== Done ==="
