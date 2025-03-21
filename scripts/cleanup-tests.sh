#!/bin/bash
set -e

echo "Cleaning up test directories..."

# Clean up test directories for all package managers
rm -rf /tmp/test-npm /tmp/test-yarn /tmp/test-pnpm

echo "Cleanup completed successfully!"
