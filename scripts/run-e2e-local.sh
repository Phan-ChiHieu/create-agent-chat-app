#!/bin/bash
set -e

# Check if package manager is provided
if [ -z "$1" ]; then
  echo "Usage: $0 <package-manager> [cleanup]"
  echo "  package-manager: npm, yarn, or pnpm"
  echo "  cleanup: add 'cleanup' as second argument to clean up test directories after tests"
  exit 1
fi

PACKAGE_MANAGER=$1
CLEANUP=$2
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Build the package first
echo "Building package..."
cd "$PROJECT_ROOT"
yarn build

# Run the test scripts
echo "Running E2E tests for $PACKAGE_MANAGER..."
"$SCRIPT_DIR/test-create-command.sh" "$PACKAGE_MANAGER"
"$SCRIPT_DIR/test-build.sh" "$PACKAGE_MANAGER"

# Clean up if requested
if [ "$CLEANUP" = "cleanup" ]; then
  echo "Cleaning up test directories..."
  "$SCRIPT_DIR/cleanup-tests.sh"
fi

echo "E2E tests for $PACKAGE_MANAGER completed successfully!"
