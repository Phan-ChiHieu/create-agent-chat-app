#!/bin/bash
set -e

# Get the package manager from the first argument
PACKAGE_MANAGER=$1
TEST_DIR="/tmp/test-${PACKAGE_MANAGER}"
PROJECT_NAME="test-agent-chat-app"
PROJECT_DIR="${TEST_DIR}/${PROJECT_NAME}"

echo "Testing build in created project with package manager: ${PACKAGE_MANAGER}"

# Navigate to the project directory
cd "${PROJECT_DIR}"

# Run the build command based on the package manager
echo "Building project..."
case "${PACKAGE_MANAGER}" in
  npm)
    npm run build
    ;;
  yarn)
    yarn build
    ;;
  pnpm)
    pnpm build
    ;;
  *)
    echo "Unsupported package manager: ${PACKAGE_MANAGER}"
    exit 1
    ;;
esac

# Check if the build was successful
if [ $? -eq 0 ]; then
  echo "Build completed successfully!"
else
  echo "Build failed!"
  exit 1
fi
