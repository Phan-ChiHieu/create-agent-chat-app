#!/bin/bash
set -e

# Get the package manager from the first argument
PACKAGE_MANAGER=$1
TEST_DIR="/tmp/test-${PACKAGE_MANAGER}"
PROJECT_NAME="test-agent-chat-app"
PROJECT_DIR="${TEST_DIR}/${PROJECT_NAME}"

echo "Testing create-agent-chat-app with package manager: ${PACKAGE_MANAGER}"

# Clean up any previous test directory
rm -rf "${PROJECT_DIR}"
mkdir -p "${TEST_DIR}"
cd "${TEST_DIR}"

# Determine the project root in local environment or CI
PROJECT_ROOT=${GITHUB_WORKSPACE:-$(cd "$(dirname "${BASH_SOURCE[0]}")" && cd .. && pwd)}

# Run the create command with the specified package manager
echo "Running create-agent-chat-app command..."
cd "${TEST_DIR}"

# Run the command directly using node with the local index.js file
echo "Using local package from ${PROJECT_ROOT}"
node "${PROJECT_ROOT}/index.js" -Y --project-name="${PROJECT_NAME}" --package-manager="${PACKAGE_MANAGER}"

# Verify the project was created
if [ ! -d "${PROJECT_DIR}" ]; then
  echo "Error: Project directory was not created at ${PROJECT_DIR}"
  exit 1
fi

echo "Project created successfully at ${PROJECT_DIR}"
