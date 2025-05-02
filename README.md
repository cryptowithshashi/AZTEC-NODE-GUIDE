# Aztec Node Kit 🚀

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A comprehensive kit for scaffolding, configuring, and running various Aztec node types (Full, Sequencer-Only, Prover) on the **alpha testnet**. This repository provides automated scripts and Docker Compose configurations to streamline the setup process.

**Current Target Aztec Version:** `0.85.0-alpha-testnet.5` (Ensure Docker image tags in `.env` and `docker-compose.yml` files match the desired version).

## Overview

The Aztec network relies on different types of nodes for its operation. This kit provides a unified structure to manage setups for the primary node types involved in block production and validation on the alpha testnet. You can easily scaffold the necessary files and launch the desired node type using simple commands.

## Node Types Explained

| Feature             | Full Node                      | Sequencer-Only Node           | Prover Node Stack                 |
| :------------------ | :----------------------------- | :---------------------------- | :-------------------------------- |
| **Primary Role** | Order txs, produce blocks, store history | Order txs, produce blocks | Generate ZK proofs for blocks     |
| **Components Run** | Sequencer + Archiver           | Sequencer                     | Prover Node + Broker + Agent(s)   |
| **Stores History?** | Yes (via Archiver)             | No                            | Yes (Prover Node includes Archiver) |
| **Produces Blocks?**| Yes (via Sequencer)            | Yes                           | No (Validates blocks via proofs)  |
| **Generates Proofs?**| No                             | No                            | Yes (via Agents)                  |
| **Requires Validator Keys?** | Yes (`VALIDATOR_PRIVATE_KEY`) | Yes (`VALIDATOR_PRIVATE_KEY`) | No                                |
| **Requires Prover Keys?** | No                             | No                            | Yes (`PROVER_PUBLISHER_PRIVATE_KEY`) |
| **Complexity** | Medium                         | Medium                        | High                              |
| **Resource Needs** | Medium                         | Medium                        | Very High (esp. RAM/CPU for Agent)|

## System Requirements

| Requirement         | Full Node                      | Sequencer-Only Node           | Prover Node Stack (Agent)        | Notes                                     |
| :------------------ | :----------------------------- | :---------------------------- | :------------------------------- | :---------------------------------------- |
| **Operating System**| Ubuntu/Debian (Recommended)    | Ubuntu/Debian (Recommended)   | Ubuntu/Debian (Recommended)    | macOS may work with manual adjustments    |
| **CPU** | 8+ Cores                       | 8+ Cores                      | **16+ Cores (Agent)** | Agent is CPU-intensive                    |
| **RAM** | 16GB+                          | 16GB+                         | **128GB+ (Agent)** | Agent is RAM-intensive                    |
| **Storage** | 100GB+ SSD                     | 50GB+ SSD                     | ~1TB SSD (Prover Node state)     | Fast SSD Recommended                      |
| **Network** | 25+ Mbps Upload/Download       | 25+ Mbps Upload/Download      | Stable Connection                | Public IP & Port 40400 Forwarding needed for Full/Sequencer P2P |
| **Dependencies** | Docker, Docker Compose, Node.js, Aztec CLI | Docker, Docker Compose, Node.js, Aztec CLI | Docker, Docker Compose, Node.js, Aztec CLI | Handled by setup scripts            |

## Prerequisites

* **Operating System:** Ubuntu/Debian-based Linux distribution (recommended).
* **Privileges:** `sudo` or root access is required for setup scripts.
* **Hardware:** Meet the minimum requirements outlined in the table above for your chosen node type.
* **Network:** Stable internet connection. Publicly reachable IP address and port `40400` (TCP/UDP) forwarded for P2P communication if running Full or Sequencer nodes.
* **Credentials & Keys:**
    * **L1 Execution Client (EL) RPC URL:** Needed by all node types. Connects to Ethereum (Sepolia testnet).
        * *Example Provider: Alchemy*
            1.  Sign up/log in at [Alchemy](https://dashboard.alchemy.com/).
            2.  Create a new App (Chain: Ethereum, Network: Sepolia).
            3.  View Key and copy the HTTPS URL (e.g., `https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY`).
    * **L1 Consensus Client (CL) RPC URL:** Needed by all node types. Connects to Ethereum's consensus layer (Sepolia testnet) for blob data.
        * *Example Provider: DRPC*
            1.  Sign up/log in at [DRPC](https://drpc.org/).
            2.  Create an API Key for the Sepolia network.
            3.  Copy the HTTPS URL (e.g., `https://lb.drpc.org/ogrpc?network=sepolia&dkey=YOUR_API_KEY`).
        * *Note:* Not all providers offer reliable CL endpoints. Alchemy, QuickNode, DRPC are known options.
    * **Validator Key Pair (for Full/Sequencer Nodes):**
        * `VALIDATOR_PRIVATE_KEY`: A **new** Ethereum private key (Hex format, e.g., `0x...`). **DO NOT USE A MAINNET KEY.**
        * `VALIDATOR_COINBASE`: The corresponding Ethereum public address for the private key above.
    * **Prover Key Pair (for Prover Node):**
        * `PROVER_PUBLISHER_PRIVATE_KEY`: A **new** Ethereum private key used by the Prover Node to submit proofs. **DO NOT USE A MAINNET KEY.**
        * `PROVER_ID`: The corresponding Ethereum public address for the private key above.
    * **(Optional) Blob Sink URL:** For Full/Sequencer nodes to offload blob fetching (e.g., from Alchemy).

**⚠️ Security Warning:** NEVER use Ethereum private keys that hold significant mainnet assets for testnet activities. Generate fresh keys specifically for running these nodes.

## Quick Start (Overview)

1.  **Clone:** `git clone https://github.com/your-org/aztec-node-kit.git && cd aztec-node-kit`
2.  **Install:** `npm install`
3.  **Scaffold:** `npm run scaffold`
4.  **Configure:** `cp .env.example .env && nano .env` (Fill in your details)
5.  **Run:** Choose *one* command: `npm run full`, `npm run sequencer`, or `npm run prover`
6.  **Monitor:** `cd <node-type> && docker-compose logs -f`
7.  **Stop:** `cd <node-type> && docker-compose down`

## Running Specific Node Types (Detailed Guides)

Follow these steps after completing the initial **Clone**, **Install**, **Scaffold**, and **Configure** steps from the Quick Start section above. Ensure your `.env` file is correctly populated with all necessary credentials for the node type you intend to run.

### 1. Running a Full Node (Sequencer + Archiver)

A Full Node participates in block production and maintains a complete history of the Aztec chain state.

**Prerequisites Met:**
* Repository cloned, `npm install` run, `npm run scaffold` run.
* `.env` file created and populated with:
    * `ETHEREUM_HOSTS` (EL RPC)
    * `L1_CONSENSUS_HOST_URLS` (CL RPC)
    * `VALIDATOR_PRIVATE_KEY`
    * `VALIDATOR_COINBASE`
    * `P2P_IP` (Verify auto-detected or set manually)
    * *(Optional)* `BLOB_SINK_URL`

**Steps:**

1.  **Execute the Setup Script:**
    This command runs `sudo bash full-node/setup.sh`. It will:
    * Verify root privileges.
    * Check/install Docker, Docker Compose, Node.js, and Aztec CLI.
    * Verify required environment variables are present in the root `.env`.
    * Copy the root `.env` to `full-node/.env`.
    * Pull the Aztec Docker image specified in `.env` (or `docker-compose.yml`).
    * Start the Docker container(s) defined in `full-node/docker-compose.yml` in detached mode (`-d`).
    ```bash
    npm run full
    ```

2.  **Monitor Logs:**
    Watch the node's output for syncing progress and potential errors.
    ```bash
    cd full-node
    docker-compose logs -f
    ```
    Look for messages indicating connection to peers, fetching L1 data, and potentially proposing blocks once synced and registered.

3.  **(Optional but Recommended) Register as Validator:**
    Once the node is running and synced, you need to register your validator address on L1 to participate in sequencing.
    * Ensure `aztec` CLI is in your PATH (`export PATH="$HOME/.aztec/bin:$PATH"` if needed).
    * Execute the command, replacing placeholders. Get the `staking-asset-handler` address from Aztec documentation or Discord for the alpha testnet.
    ```bash
    # Example command - use variables from your .env if possible
    aztec add-l1-validator \
      --l1-rpc-urls $ETHEREUM_HOSTS \
      --private-key $VALIDATOR_PRIVATE_KEY \
      --attester $VALIDATOR_COINBASE \
      --proposer-eoa $VALIDATOR_COINBASE \
      --staking-asset-handler 0xF739D03e98e23A7B65940848aBA8921fF3bAc4b2 \ # Example handler, VERIFY CURRENT ADDRESS
      --l1-chain-id 11155111 # Sepolia Chain ID
    ```
    * *Note:* There might be daily registration quotas on the testnet. If you encounter issues, try again later.

4.  **Stopping the Node:**
    ```bash
    cd full-node
    docker-compose down
    ```

### 2. Running a Sequencer-Only Node

A Sequencer-Only Node focuses solely on ordering transactions and producing blocks, without storing the full historical state like an Archiver.

**Prerequisites Met:**
* Repository cloned, `npm install` run, `npm run scaffold` run.
* `.env` file created and populated with:
    * `ETHEREUM_HOSTS` (EL RPC)
    * `L1_CONSENSUS_HOST_URLS` (CL RPC)
    * `VALIDATOR_PRIVATE_KEY`
    * `VALIDATOR_COINBASE`
    * `P2P_IP` (Verify auto-detected or set manually)
    * *(Optional)* `BLOB_SINK_URL`

**Steps:**

1.  **Execute the Setup Script:**
    This command runs `sudo bash sequencer-node/setup.sh`. It performs the same dependency checks and setup steps as the full node script but uses `sequencer-node/docker-compose.yml`.
    ```bash
    npm run sequencer
    ```

2.  **Monitor Logs:**
    ```bash
    cd sequencer-node
    docker-compose logs -f
    ```
    Look for similar logs as the Full Node regarding P2P connections and L1 interactions.

3.  **(Optional but Recommended) Register as Validator:**
    Follow the same steps as described in the Full Node guide (Step 3) to register your validator.

4.  **Stopping the Node:**
    ```bash
    cd sequencer-node
    docker-compose down
    ```

### 3. Running a Prover Node Stack

The Prover setup is more complex, involving multiple services working together to generate ZK proofs for Aztec blocks. It requires significant hardware resources.

**Prerequisites Met:**
* Repository cloned, `npm install` run, `npm run scaffold` run.
* `.env` file created and populated with:
    * `ETHEREUM_HOSTS` (EL RPC)
    * `L1_CONSENSUS_HOST_URLS` (CL RPC)
    * `PROVER_PUBLISHER_PRIVATE_KEY`
    * `PROVER_ID` (Address corresponding to the publisher key)
    * `P2P_IP` (For the Prover Node component, if P2P is enabled)

**Steps:**

1.  **Execute the Setup Script:**
    This command runs `sudo bash prover-node/setup.sh`. It performs dependency checks and setup, using `prover-node/docker-compose.yml` which defines three services: `prover_node`, `broker`, and `agent`.
    ```bash
    npm run prover
    ```

2.  **Monitor Logs:**
    Since there are multiple services, you can view logs for all of them or target specific ones:
    ```bash
    cd prover-node

    # View logs for all prover services (Node, Broker, Agent)
    docker-compose logs -f

    # View logs for only the Prover Agent
    docker-compose logs -f agent

    # View logs for only the Prover Node
    docker-compose logs -f prover_node

    # View logs for only the Broker
    docker-compose logs -f broker
    ```
    * **Prover Node Logs:** Look for messages about polling L1 for unproven blocks and submitting jobs to the broker.
    * **Broker Logs:** Look for messages about receiving jobs from the node and distributing them to agents.
    * **Agent Logs:** Look for messages about polling the broker for jobs, performing proof generation (this can take time and be CPU/RAM intensive), and returning results to the broker.

3.  **Stopping the Node Stack:**
    This command stops and removes all containers defined in `prover-node/docker-compose.yml`.
    ```bash
    cd prover-node
    docker-compose down
    ```

## Repository Structure

aztec-node-kit/├── full-node/│   ├── setup.sh          # Installs deps, checks env, runs 'docker-compose up' for Full Node│   └── docker-compose.yml# Docker Compose definition for Full Node (Sequencer + Archiver)├── sequencer-node/│   ├── setup.sh          # Installs deps, checks env, runs 'docker-compose up' for Sequencer│   └── docker-compose.yml# Docker Compose definition for Sequencer-Only Node├── prover-node/│   ├── setup.sh          # Installs deps, checks env, runs 'docker-compose up' for Prover│   └── docker-compose.yml# Docker Compose definition for Prover (Node, Broker, Agent)├── .env.example          # Template for environment variables (RPC URLs, keys, etc.)├── .env                  # Your actual environment variables (created from .env.example, gitignored)├── scripts/│   └── scaffold.js       # Node.js script to generate the directory structure and files├── .vscode/              # Recommended VS Code settings & extensions│   ├── extensions.json│   └── settings.json├── package.json          # Defines npm scripts (scaffold, full, sequencer, prover)├── package-lock.json     # Records exact dependency versions├── README.md             # This file└── .gitignore            # Prevents committing sensitive files like .env and node_modules
## Troubleshooting

* **Permission Errors:** Ensure you run the `setup.sh` scripts (via `npm run <type>`) with `sudo`.
* **Docker/Docker Compose Issues:** Verify installation (`docker --version`, `docker-compose --version`). Restart Docker daemon (`sudo systemctl restart docker`).
* **Aztec CLI Issues:** Ensure `aztec-up` is in PATH (`export PATH="$HOME/.aztec/bin:$PATH"`). Run `aztec-up alpha-testnet` manually if needed.
* **RPC URL Errors:** Double-check URLs and API keys in `.env`. Ensure they are for Sepolia.
* **Port Conflicts:** Modify `ports` in `docker-compose.yml` if `8080` or `40400` are in use (e.g., `"8081:8080"`).
* **P2P Connectivity (Full/Sequencer):** Verify `P2P_IP` in `.env`. Ensure port `40400` (TCP/UDP) is forwarded in your firewall/router.
* **Node Not Syncing:** Check logs (`docker-compose logs -f`) for specific errors. Consult the Aztec Discord.
* **Prover Resource Issues:** If the `agent` crashes, it likely needs more CPU/RAM. Adjust `deploy.resources` in `prover-node/docker-compose.yml` and ensure the host has sufficient capacity.
* **`.env` File Not Found:** Ensure you copied `.env.example` to `.env` in the *root* directory before running `npm run <type>`.

## Advanced Configuration

* **Custom Ports/Volumes:** Modify `ports` and `volumes` sections in `docker-compose.yml` files.
* **Resource Limits (Prover):** Uncomment and adjust `deploy.resources` in `prover-node/docker-compose.yml`.
* **Multiple Prover Agents:** Replicate the `agent` service definition in `prover-node/docker-compose.yml` for more containers (potentially on different machines). `PROVER_AGENT_COUNT` controls parallelism *within* an agent container.
* **Using `host.docker.internal`:** If running L1 nodes on the *same host*, use `http://host.docker.internal:<port>` instead of `http://localhost:<port>` in `.env`. Alternatively, use `network_mode: host` (less isolation).

## License

This project is licensed under the MIT License.

## Disclaimer

This software is provided "as is". Running nodes on testnets involves risks. This kit is for development/testing on the Aztec alpha testnet. **Do not use mainnet keys.** Use at your own risk. Refer to official [Aztec Documentation](https://docs.aztec.network/).
