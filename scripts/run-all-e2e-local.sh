#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Run tests for each package manager
echo "Running E2E tests for all package managers..."

# Test npm
echo "=== Testing with npm ==="
"$SCRIPT_DIR/run-e2e-local.sh" npm

# Test yarn
echo "=== Testing with yarn ==="
"$SCRIPT_DIR/run-e2e-local.sh" yarn

# Test pnpm
echo "=== Testing with pnpm ==="
"$SCRIPT_DIR/run-e2e-local.sh" pnpm

# Clean up after all tests
echo "Cleaning up test directories..."
"$SCRIPT_DIR/cleanup-tests.sh"

echo "All E2E tests completed successfully!"
