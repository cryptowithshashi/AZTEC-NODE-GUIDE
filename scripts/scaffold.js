#!/usr/bin/env node

// Import necessary modules
const fs = require('fs-extra'); // Use fs-extra for easier directory creation and file writing
const path = require('path');

// Define the root directory of the project
const rootDir = path.join(__dirname, '..');

// Define the Aztec Docker image tag (centralized here for consistency)
// Ensure this matches the version specified in .env.example and README
const AZTEC_DOCKER_IMAGE_TAG = 'aztecprotocol/aztec:0.85.0-alpha-testnet.5';

// --- Helper Function to create directories and files ---
async function createStructure() {
    console.log('🏗️ Starting scaffolding process...');

    try {
        // --- Create Node Type Directories ---
        const nodeTypes = ['full-node', 'sequencer-node', 'prover-node'];
        for (const nodeType of nodeTypes) {
            const nodeDir = path.join(rootDir, nodeType);
            await fs.ensureDir(nodeDir); // Creates directory if it doesn't exist
            console.log(`   ✅ Created directory: ${nodeType}/`);

            // --- Create setup.sh for each node type ---
            const setupScriptPath = path.join(nodeDir, 'setup.sh');
            const setupScriptContent = generateSetupSh(nodeType);
            await fs.writeFile(setupScriptPath, setupScriptContent);
            await fs.chmod(setupScriptPath, 0o755); // Make executable (rwxr-xr-x)
            console.log(`      ✅ Created executable: ${nodeType}/setup.sh`);

            // --- Create docker-compose.yml for each node type ---
            const composePath = path.join(nodeDir, 'docker-compose.yml');
            const composeContent = generateDockerCompose(nodeType);
            await fs.writeFile(composePath, composeContent);
            console.log(`      ✅ Created: ${nodeType}/docker-compose.yml`);
        }

        // --- Create .vscode directory and files ---
        const vscodeDir = path.join(rootDir, '.vscode');
        await fs.ensureDir(vscodeDir);
        console.log(`   ✅ Created directory: .vscode/`);

        const extensionsPath = path.join(vscodeDir, 'extensions.json');
        await fs.writeJson(extensionsPath, generateVsCodeExtensions(), { spaces: 2 });
        console.log(`      ✅ Created: .vscode/extensions.json`);

        const settingsPath = path.join(vscodeDir, 'settings.json');
        await fs.writeJson(settingsPath, generateVsCodeSettings(), { spaces: 2 });
        console.log(`      ✅ Created: .vscode/settings.json`);

        // --- Check if .env.example exists (it should be created manually or already present) ---
        const envExamplePath = path.join(rootDir, '.env.example');
        if (!await fs.pathExists(envExamplePath)) {
            console.warn(`   ⚠️ Warning: .env.example not found. Please create it manually.`);
        } else {
            console.log(`   ✅ Found: .env.example`);
        }

        // --- Check if package.json exists (it should) ---
        const packageJsonPath = path.join(rootDir, 'package.json');
        if (!await fs.pathExists(packageJsonPath)) {
             console.warn(`   ⚠️ Warning: package.json not found.`);
        } else {
             console.log(`   ✅ Found: package.json`);
        }

        // --- Check if README.md exists (it should be created manually or already present) ---
         const readmePath = path.join(rootDir, 'README.md');
         if (!await fs.pathExists(readmePath)) {
             console.warn(`   ⚠️ Warning: README.md not found. Please create it manually.`);
         } else {
             console.log(`   ✅ Found: README.md`);
         }


        console.log('\n🎉 Scaffolding complete! Run `npm install` if you haven\'t already.');
        console.log('Next steps:');
        console.log('1. Copy `.env.example` to `.env` (`cp .env.example .env`)');
        console.log('2. Fill in your RPC URLs and private keys in `.env`');
        console.log('3. Choose a node type and run its setup script:');
        console.log('   - `npm run full`');
        console.log('   - `npm run sequencer`');
        console.log('   - `npm run prover`');

    } catch (error) {
        console.error('❌ Error during scaffolding:', error);
        process.exit(1); // Exit with error code
    }
}

// --- Content Generation Functions ---

function generateSetupSh(nodeType) {
    // Common preamble for all setup scripts
    let script = `#!/usr/bin/env bash
set -euo pipefail

# Color codes for output
CYAN='\\033[0;36m'
GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
RED='\\033[0;31m'
BOLD='\\033[1m'
RESET='\\033[0m'

echo -e "\${CYAN}\${BOLD}"
echo "-----------------------------------------------------"
echo "  CWS | Aztec Node Kit - Setting up ${nodeType}"
echo "-----------------------------------------------------"
echo -e "\${RESET}"

# --- Configuration ---
NODE_TYPE="${nodeType}"
# Go to the script's directory to ensure docker-compose and .env are found correctly
cd "$(dirname "$0")"
ROOT_ENV_FILE="../.env" # Path to the root .env file
LOCAL_ENV_FILE=".env" # Path to the local .env file for this node type
DOCKER_COMPOSE_FILE="docker-compose.yml"
REQUIRED_VARS_COMMON=("ETHEREUM_HOSTS" "L1_CONSENSUS_HOST_URLS")
REQUIRED_VARS_SEQUENCER=("VALIDATOR_PRIVATE_KEY" "VALIDATOR_COINBASE") # Also used by full node
REQUIRED_VARS_PROVER=("PROVER_PUBLISHER_PRIVATE_KEY" "PROVER_ID")

# --- Helper Functions ---
check_command() {
  if ! command -v $1 &> /dev/null; then
    echo -e "\${YELLOW}⚠️ Command '$1' not found.\${RESET}"
    return 1
  else
    echo -e "\${GREEN}✅ Command '$1' found.\${RESET}"
    return 0
  fi
}

install_docker() {
  echo -e "\${CYAN}🔧 Installing Docker...\${RESET}"
  apt-get update > /dev/null
  apt-get install -y apt-transport-https ca-certificates curl gnupg-agent software-properties-common > /dev/null
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | apt-key add - > /dev/null
  add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" > /dev/null
  apt-get update > /dev/null
  apt-get install -y docker-ce docker-ce-cli containerd.io > /dev/null
  echo -e "\${GREEN}✅ Docker installed.\${RESET}"
}

install_docker_compose() {
  echo -e "\${CYAN}🔧 Installing Docker Compose...\${RESET}"
  # Install Docker Compose V2 (recommended)
  apt-get update > /dev/null
  apt-get install -y docker-compose-plugin > /dev/null
  # Fallback for older systems or if V2 plugin fails: Install V1
  if ! command -v docker-compose &> /dev/null; then
      echo -e "\${YELLOW}   Docker Compose V2 plugin failed or not available, trying V1...\${RESET}"
      LATEST_COMPOSE_V1=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep 'tag_name' | cut -d\" -f4)
      if [ -z "$LATEST_COMPOSE_V1" ]; then
          LATEST_COMPOSE_V1="1.29.2" # Fallback version
          echo -e "\${YELLOW}   Could not fetch latest V1 version, using ${LATEST_COMPOSE_V1}.\${RESET}"
      fi
      curl -L "https://github.com/docker/compose/releases/download/${LATEST_COMPOSE_V1}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose > /dev/null
      chmod +x /usr/local/bin/docker-compose
  fi
   echo -e "\${GREEN}✅ Docker Compose installed.\${RESET}"
}

install_nodejs() {
  echo -e "\${CYAN}🔧 Installing Node.js (latest LTS)...\${RESET}"
  # Use NodeSource repository for up-to-date versions
  apt-get update > /dev/null
  apt-get install -y ca-certificates curl gnupg > /dev/null
  mkdir -p /etc/apt/keyrings
  curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg > /dev/null
  NODE_MAJOR=20 # Specify LTS version (e.g., 20)
  echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_\$NODE_MAJOR.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list > /dev/null
  apt-get update > /dev/null
  apt-get install nodejs -y > /dev/null
  echo -e "\${GREEN}✅ Node.js installed.\${RESET}"
}

install_aztec_cli() {
    echo -e "\${CYAN}🔧 Installing Aztec CLI...\${RESET}"
    # Ensure the user running sudo has the correct home directory context
    # Temporarily switch to a common user if needed, or ensure ~/.aztec exists for root
    # This assumes the script runner has a standard home dir setup or root owns /root/.aztec
    if command -v aztec-up &> /dev/null; then
        echo -e "\${YELLOW}   Aztec CLI already installed. Updating...\${RESET}"
    fi
    curl -sL https://install.aztec.network | bash
    # Add aztec to PATH for the current session if not already present
    if [[ ":$PATH:" != *":$HOME/.aztec/bin:"* ]]; then
        export PATH="$HOME/.aztec/bin:$PATH"
        echo -e "\${YELLOW}   Added ~/.aztec/bin to PATH for this session.\${RESET}"
    fi
    # Verify installation
    if ! command -v aztec-up &> /dev/null; then
      echo -e "\${RED}❌ Aztec CLI installation failed. Please check https://docs.aztec.network/aztec/getting-started/installation \${RESET}"
      exit 1
    fi
    echo -e "\${CYAN}   Syncing with alpha-testnet...\${RESET}"
    aztec-up alpha-testnet
    echo -e "\${GREEN}✅ Aztec CLI installed and synced.\${RESET}"
}

# --- Sanity Checks ---
echo -e "\n${BOLD}🔍 Performing System Checks...${RESET}"

# 1. Check for root/sudo privileges
if [ "$(id -u)" -ne 0 ]; then
  echo -e "${RED}❌ This script requires root (or sudo) privileges to install dependencies.${RESET}"
  exit 1
else
  echo -e "${GREEN}✅ Running with root privileges.${RESET}"
fi

# 2. Check for OS (basic check for Debian/Ubuntu)
if [ -f /etc/os-release ]; then
    . /etc/os-release
    if [[ "$ID" == "ubuntu" || "$ID_LIKE" == "debian" ]]; then
        echo -e "${GREEN}✅ Detected Ubuntu/Debian based system.${RESET}"
    else
        echo -e "${YELLOW}⚠️ Warning: Detected OS '$ID'. This script is optimized for Ubuntu/Debian. Proceeding, but installation steps might need manual adjustment.${RESET}"
    fi
else
    echo -e "${YELLOW}⚠️ Warning: Could not detect OS. Proceeding, but installation steps might need manual adjustment.${RESET}"
fi


# 3. Check and Install Dependencies
echo -e "\n${BOLD}🔧 Checking Dependencies...${RESET}"
check_command docker || install_docker
check_command docker-compose || install_docker_compose # Checks both v1 and v2 plugin
check_command node || install_nodejs
check_command aztec-up || install_aztec_cli

# --- Environment Variable Setup ---
echo -e "\n${BOLD}🔑 Setting up Environment Variables...${RESET}"

# Check if the root .env file exists
if [ ! -f "$ROOT_ENV_FILE" ]; then
    echo -e "${RED}❌ Root environment file '$ROOT_ENV_FILE' not found.${RESET}"
    echo -e "${YELLOW}   Please copy '.env.example' to '.env' in the project root and fill in your details.${RESET}"
    exit 1
fi

# Source the root .env file to make variables available
set -o allexport # Export all variables defined in the sourced file
source "$ROOT_ENV_FILE"
set +o allexport
echo -e "${GREEN}✅ Sourced variables from '$ROOT_ENV_FILE'.${RESET}"

# Create a local .env file specific to this node type, inheriting from root
echo -e "${CYAN}   Creating local '$LOCAL_ENV_FILE' for ${NODE_TYPE}...${RESET}"
cp "$ROOT_ENV_FILE" "$LOCAL_ENV_FILE"

# Validate required environment variables
MISSING_VARS=()
echo -e "${CYAN}   Validating required variables...${RESET}"

# Common variables
for var in "\${REQUIRED_VARS_COMMON[@]}"; do
  if [ -z "\${!var+x}" ] || [ -z "\${!var}" ]; then # Check if var is unset or empty
    MISSING_VARS+=("$var")
  fi
done

# Node-specific variables
if [ "$NODE_TYPE" == "full-node" ] || [ "$NODE_TYPE" == "sequencer-node" ]; then
  for var in "\${REQUIRED_VARS_SEQUENCER[@]}"; do
    if [ -z "\${!var+x}" ] || [ -z "\${!var}" ]; then
      MISSING_VARS+=("$var")
    fi
  done
fi
if [ "$NODE_TYPE" == "prover-node" ]; then
  for var in "\${REQUIRED_VARS_PROVER[@]}"; do
    if [ -z "\${!var+x}" ] || [ -z "\${!var}" ]; then
      MISSING_VARS+=("$var")
    fi
  done
fi

# Check if P2P_IP needs fetching
if [ -z "\${P2P_IP+x}" ] || [ -z "\${P2P_IP}" ]; then
    echo -e "\${YELLOW}   P2P_IP not set in '$ROOT_ENV_FILE'. Attempting to fetch public IP...${RESET}"
    FETCHED_IP=$(curl -s --connect-timeout 5 ifconfig.me || echo "")
    if [ -n "$FETCHED_IP" ]; then
        echo -e "\${GREEN}   Fetched Public IP: $FETCHED_IP ${RESET}"
        # Add/Update P2P_IP in the local .env file
        if grep -q "^P2P_IP=" "$LOCAL_ENV_FILE"; then
             sed -i "s|^P2P_IP=.*|P2P_IP=\"$FETCHED_IP\"|" "$LOCAL_ENV_FILE"
        else
             echo "P2P_IP=\"$FETCHED_IP\"" >> "$LOCAL_ENV_FILE"
        fi
        # Re-source the local file to make the fetched IP available for validation
        set -o allexport
        source "$LOCAL_ENV_FILE"
        set +o allexport
    else
        echo -e "\${YELLOW}   Could not automatically fetch public IP. Please set P2P_IP manually in '$ROOT_ENV_FILE'.${RESET}"
        MISSING_VARS+=("P2P_IP (auto-fetch failed)")
    fi
fi


# Report missing variables and exit if necessary
if [ \${#MISSING_VARS[@]} -ne 0 ]; then
  echo -e "\${RED}❌ Error: The following required environment variables are missing or empty in '$ROOT_ENV_FILE':${RESET}"
  for var in "\${MISSING_VARS[@]}"; do
    echo -e "   - $var"
  done
  echo -e "\${YELLOW}   Please ensure they are set correctly before running this script.${RESET}"
  exit 1
else
  echo -e "\${GREEN}✅ All required environment variables are set.${RESET}"
fi

# --- Docker Compose Execution ---
echo -e "\n${BOLD}🚀 Starting Docker Compose for ${NODE_TYPE}...${RESET}"

if [ ! -f "$DOCKER_COMPOSE_FILE" ]; then
    echo -e "${RED}❌ Docker Compose file '$DOCKER_COMPOSE_FILE' not found in $(pwd).${RESET}"
    echo -e "${YELLOW}   Run 'npm run scaffold' again if files are missing.${RESET}"
    exit 1
fi

# Pull the latest image specified in the compose file (or .env)
echo -e "${CYAN}   Pulling Docker image(s)...${RESET}"
docker-compose -f "$DOCKER_COMPOSE_FILE" --env-file "$LOCAL_ENV_FILE" pull

# Start the services in detached mode
echo -e "${CYAN}   Running 'docker-compose up -d'...${RESET}"
docker-compose -f "$DOCKER_COMPOSE_FILE" --env-file "$LOCAL_ENV_FILE" up -d

# --- Completion Message ---
echo -e "\n${GREEN}${BOLD}✅ Setup complete for ${NODE_TYPE}!${RESET}"
echo -e "   Your node should now be running in the background."
echo -e "   To view logs, run: ${CYAN}cd ${NODE_TYPE} && docker-compose logs -f${RESET}"
echo -e "   To stop the node, run: ${CYAN}cd ${NODE_TYPE} && docker-compose down${RESET}"

# Specific next steps based on node type
if [ "$NODE_TYPE" == "sequencer-node" ] || [ "$NODE_TYPE" == "full-node" ]; then
    echo -e "\n${YELLOW}💡 Next Step (Sequencer/Full Node):${RESET}"
    echo -e "   Once your node is synced, you may need to register as an L1 validator."
    echo -e "   See Aztec docs: https://docs.aztec.network/aztec/how-to/run-nodes/run-a-sequencer-node#register-as-a-validator"
    echo -e "   Example command (replace placeholders):"
    echo -e "   ${CYAN}aztec add-l1-validator --l1-rpc-urls \$ETHEREUM_HOSTS --private-key \$VALIDATOR_PRIVATE_KEY --attester \$VALIDATOR_COINBASE --proposer-eoa \$VALIDATOR_COINBASE --staking-asset-handler <HANDLER_ADDRESS> --l1-chain-id 11155111${RESET}"
fi

echo -e "\n${CYAN}Happy Azteching!${RESET}"

exit 0
`;
    return script;
}


function generateDockerCompose(nodeType) {
    let compose = `version: "3.8"

# Docker Compose configuration for Aztec ${nodeType}
# Environment variables are loaded from the .env file in this directory

services:
`;

    // Define common service properties
    const commonEnv = `
      # --- Common Environment Variables (from .env) ---
      - ETHEREUM_HOSTS=\${ETHEREUM_HOSTS}
      - L1_CONSENSUS_HOST_URLS=\${L1_CONSENSUS_HOST_URLS}
      - P2P_IP=\${P2P_IP}
      - DATA_DIRECTORY=\${DATA_DIRECTORY:-/data}
      - LOG_LEVEL=\${LOG_LEVEL:-info}
      - AZTEC_NETWORK=\${AZTEC_NETWORK:-alpha-testnet}
      # - P2P_MAX_TX_POOL_SIZE=\${P2P_MAX_TX_POOL_SIZE:-1000000000} # Optional, uncomment if needed
`;
    const commonVolumes = `
    volumes:
      # Mount a local directory 'node-data' into the container at the specified DATA_DIRECTORY
      - ./node-data:\${DATA_DIRECTORY:-/data}
`;
    const commonPorts = `
    ports:
      # P2P port for node discovery and communication
      - "40400:40400/tcp"
      - "40400:40400/udp"
      # RPC port (if applicable, default is 8080 for Aztec nodes)
      - "8080:8080"
`;

    // --- Node Specific Service Definitions ---

    if (nodeType === 'full-node') {
        compose += `
  full_node:
    image: \${AZTEC_DOCKER_IMAGE_TAG:-${AZTEC_DOCKER_IMAGE_TAG}}
    container_name: aztec_full_node
    restart: unless-stopped
    # network_mode: host # Uncomment if needed, e.g., for local L1 node access, but prefer host.docker.internal if possible
    environment:
${commonEnv}
      # --- Sequencer Specific (Required for Full Node) ---
      - VALIDATOR_PRIVATE_KEY=\${VALIDATOR_PRIVATE_KEY}
      - VALIDATOR_COINBASE=\${VALIDATOR_COINBASE}
      # --- Optional Blob Sink ---
      - BLOB_SINK_URL=\${BLOB_SINK_URL:-} # Pass empty string if not set in .env
    command: >
      node --no-warnings /usr/src/yarn-project/aztec/dest/bin/index.js start
      --network \${AZTEC_NETWORK:-alpha-testnet}
      --node
      --archiver
      --sequencer
      # Conditionally add blob sink flag only if BLOB_SINK_URL is set and not empty
      \${BLOB_SINK_URL:+--sequencer.blobSinkUrl \${BLOB_SINK_URL}}
${commonPorts}
${commonVolumes}
`;
    } else if (nodeType === 'sequencer-node') {
        compose += `
  sequencer_node:
    image: \${AZTEC_DOCKER_IMAGE_TAG:-${AZTEC_DOCKER_IMAGE_TAG}}
    container_name: aztec_sequencer_node
    restart: unless-stopped
    # network_mode: host
    environment:
${commonEnv}
      # --- Sequencer Specific ---
      - VALIDATOR_PRIVATE_KEY=\${VALIDATOR_PRIVATE_KEY}
      - VALIDATOR_COINBASE=\${VALIDATOR_COINBASE}
      # --- Optional Blob Sink ---
      - BLOB_SINK_URL=\${BLOB_SINK_URL:-}
    command: >
      node --no-warnings /usr/src/yarn-project/aztec/dest/bin/index.js start
      --network \${AZTEC_NETWORK:-alpha-testnet}
      --node
      --sequencer
      # Conditionally add blob sink flag
      \${BLOB_SINK_URL:+--sequencer.blobSinkUrl \${BLOB_SINK_URL}}
${commonPorts}
${commonVolumes}
`;
    } else if (nodeType === 'prover-node') {
        compose += `
  # --- Prover Node Service ---
  # Polls L1, manages proving jobs, submits final proof
  prover_node:
    image: \${AZTEC_DOCKER_IMAGE_TAG:-${AZTEC_DOCKER_IMAGE_TAG}}
    container_name: aztec_prover_node
    restart: unless-stopped
    depends_on:
      broker:
        condition: service_started # Ensure broker is running before node starts
    # network_mode: host # May be needed if accessing local L1 node directly
    environment:
${commonEnv}
      # --- Prover Node Specific ---
      - PROVER_PUBLISHER_PRIVATE_KEY=\${PROVER_PUBLISHER_PRIVATE_KEY}
      - PROVER_BROKER_HOST=http://broker:8080 # Internal Docker network hostname for the broker
      # - PROVER_COORDINATION_NODE_URL=http://<your_validator_ip>:8080 # Optional: Use a validator as a coordination point instead of P2P
      # - P2P_ENABLED=false # Set to false if using PROVER_COORDINATION_NODE_URL
      # - DATA_STORE_MAP_SIZE_KB="134217728" # Optional: Adjust data store size if needed
    command: >
      node --no-warnings /usr/src/yarn-project/aztec/dest/bin/index.js start
      --network \${AZTEC_NETWORK:-alpha-testnet}
      --prover-node
      --archiver # Prover node also needs archiver functionality
${commonPorts} # Exposes p2p and potentially RPC for the prover node itself
${commonVolumes} # Mounts data volume for prover node state

  # --- Proving Broker Service ---
  # Manages the queue of proving jobs and distributes them to agents
  broker:
    image: \${AZTEC_DOCKER_IMAGE_TAG:-${AZTEC_DOCKER_IMAGE_TAG}}
    container_name: aztec_prover_broker
    restart: unless-stopped
    # No external ports needed for the broker usually, agents connect internally
    ports:
      - "8081:8080" # Expose broker's internal 8080 on host 8081 for potential external monitoring/debugging
    environment:
      # Broker needs L1 access to verify job details
      - ETHEREUM_HOSTS=\${ETHEREUM_HOSTS}
      - L1_CONSENSUS_HOST_URLS=\${L1_CONSENSUS_HOST_URLS} # May also be needed depending on implementation
      - DATA_DIRECTORY=\${DATA_DIRECTORY:-/data} # Broker might store job queue state
      - LOG_LEVEL=\${LOG_LEVEL:-info}
      - AZTEC_NETWORK=\${AZTEC_NETWORK:-alpha-testnet}
    command: >
      node --no-warnings /usr/src/yarn-project/aztec/dest/bin/index.js start
      --network \${AZTEC_NETWORK:-alpha-testnet}
      --prover-broker
    volumes:
      # Separate data volume for the broker if needed, or share with node
      - ./broker-data:\${DATA_DIRECTORY:-/data}

  # --- Proving Agent Service ---
  # Executes the actual proof generation tasks
  agent:
    image: \${AZTEC_DOCKER_IMAGE_TAG:-${AZTEC_DOCKER_IMAGE_TAG}}
    container_name: aztec_prover_agent
    restart: unless-stopped
    depends_on:
      - broker # Agent needs the broker to get jobs
    # No ports needed, agent communicates internally with broker
    environment:
      # --- Agent Specific ---
      - PROVER_BROKER_HOST=http://broker:8080 # Connect to the broker service
      - PROVER_ID=\${PROVER_ID} # Address corresponding to PROVER_PUBLISHER_PRIVATE_KEY
      - PROVER_AGENT_COUNT=\${PROVER_AGENT_COUNT:-1} # Number of parallel proving threads/processes within this agent container
      - PROVER_AGENT_POLL_INTERVAL_MS=\${PROVER_AGENT_POLL_INTERVAL_MS:-10000} # How often to poll broker for jobs
      - LOG_LEVEL=\${LOG_LEVEL:-info}
      - AZTEC_NETWORK=\${AZTEC_NETWORK:-alpha-testnet}
      # Agent is generally stateless, no volume needed unless caching intermediate results
    command: >
      node --no-warnings /usr/src/yarn-project/aztec/dest/bin/index.js start
      --network \${AZTEC_NETWORK:-alpha-testnet}
      --prover-agent
    # --- Resource Limits (IMPORTANT FOR PROVERS) ---
    # Adjust these based on your hardware and desired number of agents
    # deploy:
    #   resources:
    #     limits:
    #       cpus: '16' # Example: Limit to 16 CPU cores
    #       memory: '128G' # Example: Limit to 128 GB RAM
    #     reservations:
    #       cpus: '8' # Example: Reserve 8 CPU cores
    #       memory: '64G' # Example: Reserve 64 GB RAM

# Define named volumes for data persistence
volumes:
  node-data:
  broker-data: # Only used if broker needs persistent storage
`;
    } else {
        compose += `  # Invalid node type specified in scaffold script\n`;
    }

    return compose;
}


function generateVsCodeExtensions() {
    return {
        "recommendations": [
            "dbaeumer.vscode-eslint", // JavaScript/TypeScript linting
            "esbenp.prettier-vscode", // Code formatting
            "ms-azuretools.vscode-docker", // Docker integration
            "redhat.vscode-yaml", // YAML editing support (for docker-compose)
            "shd101wyy.markdown-preview-enhanced", // Enhanced Markdown preview
            "timonwong.shellcheck", // Shell script linting
            "github.vscode-github-actions" // GitHub Actions integration
        ]
    };
}

function generateVsCodeSettings() {
    return {
        "files.eol": "\n", // Enforce Linux line endings
        "editor.tabSize": 2,
        "editor.insertSpaces": true,
        "editor.renderWhitespace": "boundary",
        "files.trimTrailingWhitespace": true,
        "files.insertFinalNewline": true,
        "[markdown]": {
            "files.trimTrailingWhitespace": false
        },
        "[shellscript]": {
            "editor.tabSize": 2,
            "editor.insertSpaces": true
        },
        "[yaml]": {
            "editor.tabSize": 2,
            "editor.insertSpaces": true,
            "editor.autoIndent": "advanced"
        },
        "eslint.validate": [
            "javascript",
            "javascriptreact",
            "typescript",
            "typescriptreact"
        ],
        "editor.codeActionsOnSave": {
            "source.fixAll.eslint": "explicit"
        },
        "shellcheck.executablePath": "/usr/bin/shellcheck", // Adjust if shellcheck is installed elsewhere
        "shellcheck.run": "onType", // Or "onSave"
         // Optional: Exclude generated node_modules from file explorer
        "files.exclude": {
            "**/.git": true,
            "**/.svn": true,
            "**/.hg": true,
            "**/CVS": true,
            "**/.DS_Store": true,
            "**/Thumbs.db": true,
            "node_modules": true // Exclude node_modules
        }
    };
}


// --- Execute the Scaffolding ---
createStructure();

