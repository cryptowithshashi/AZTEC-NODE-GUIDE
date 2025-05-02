# Aztec Node Kit 🚀

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A beginner‑friendly toolkit to scaffold, configure, and run Aztec nodes—Full, Sequencer‑Only, and Prover—on the **alpha testnet**. Follow these steps to get up and running quickly, with detailed explanations along the way.


## Overview

This kit automates:

- 🎛️ **Scaffolding**: Creates config files from templates.  
- 🐳 **Dockerized Environments**: Launches each node in isolated containers via Docker Compose.  
- 🔧 **Setup Assistance**: Installs dependencies (Docker, Node.js, Aztec CLI) and checks your environment.

Pick a node type, fill in a few variables, and run one `npm` command to start.



## Features

- **Full Node**: Produces blocks, archives chain history, participates in P2P gossip.  
- **Sequencer‑Only Node**: Orders transactions and builds blocks without storing full history.  
- **Prover Node Stack**: Generates zero‑knowledge proofs via Prover Node, Broker, and Agents.  
- **One‑Command Launch**: `npm run full`, `npm run sequencer`, `npm run prover`.  
- **Cross‑Platform Consistency**: Docker ensures identical setups.  
- **Automated Checks**: Validates Docker, Node.js, and Aztec CLI installations.



## System Requirements

| Requirement      | Full & Sequencer Nodes | Prover Node Stack     | Notes                              |
|------------------|------------------------|-----------------------|------------------------------------|
| **OS**           | Ubuntu/Debian          | Ubuntu/Debian         | macOS/WSL may work with tweaks     |
| **CPU Cores**    | ≥ 8                    | ≥ 16                  | Prover agents are CPU‑heavy        |
| **RAM**          | ≥ 16 GB                | ≥ 128 GB              | Prover agents need lots of memory |
| **Disk**         | ≥ 100 GB SSD           | ≥ 1 TB SSD            | NVMe recommended                   |
| **Network**      | ≥ 25 Mbps up/down      | Stable, high bandwidth| Port 40400 (TCP/UDP) must be open |
| **Dependencies** | Docker, Compose, Node.js (v18+), Aztec CLI | Same           | `scripts/setup.sh` installs them   |



## Prerequisites

1. **OS**: Ubuntu/Debian-based Linux.  
2. **Privileges**: `sudo`/root to install packages and run scripts.
3. **Network**:  
   - Stable Internet.  
   - Public IP forwarding port 40400 (TCP/UDP) for Full/Sequencer nodes. 
 
4. **Sepolia RPC URLs**:  
   - **EL** (Execution Layer): e.g. Alchemy, Infura.  
   - **CL** (Consensus Layer): e.g. DRPC, QuickNode.
  
5. **Testnet Keys**: Generate fresh validator and prover keys for Sepolia. **Never use mainnet keys!**



## Installation & Setup

1.  **Clone the Repository:**
    ```bash
    git clone https://github.com/cryptowithshashi/AZTEC-NODE-GUIDE.git 
    cd AZTEC-NODE-GUIDE
    ```

2.  **Install Scaffolding Dependencies:**
    This installs `fs-extra` needed by the scaffold script.
    ```bash
    npm install
    ```

3.  **Run the Scaffolding Script:**
    This creates the `full-node/`, `sequencer-node/`, `prover-node/` directories and populates them with the necessary `setup.sh` (already executable) and `docker-compose.yml` files.
    ```bash
    npm run scaffold
    ```

4.  **Configure Environment Variables:**
    Copy the example environment file and edit it with your specific RPC URLs, keys, and public IP address.
    ```bash
    cp .env.example .env
    nano .env # Or use your preferred editor
    ```
    * Fill in `ETHEREUM_HOSTS`, `L1_CONSENSUS_HOST_URLS`.
    * Fill in `VALIDATOR_PRIVATE_KEY` and `VALIDATOR_COINBASE` if running Full/Sequencer.
    * Fill in `PROVER_PUBLISHER_PRIVATE_KEY` and `PROVER_ID` if running Prover.
    * Set `P2P_IP` (the setup scripts attempt to auto-detect, but verify it's correct, especially if behind NAT).
    * *(Optional)* Set `BLOB_SINK_URL`.

5.  **Run the Setup Script for Your Chosen Node Type:**
    Choose *one* command. These scripts will check/install dependencies (Docker, Node.js, Aztec CLI), validate your `.env` file, and start the Docker containers.
    
    For Full Node:

    ```bash
    npm run full
    ```

    For Sequencer-Only Node:

    ```
    npm run sequencer
    ```

    For Prover Node:

    ```
    npm run prover
    ```

6.  **Monitor Your Node:**
    Navigate to the specific node directory and view logs:
    ```bash
    cd <node-type>
    ```
    Replace <node-type> with full-node, sequencer, or prover-stack

7.  **Stopping Your Node:**
    Navigate to the specific node directory and stop the containers:
    ```bash
    docker-compose logs -f
    ```
    This step might not be necessary if using docker-compose -f docker-compose -f docker/<node-type>.yml logs -f # Replace <node-type> with full-node, sequencer, or prover-stack
    
## Node Types & Detailed Guides

### Full Node

```bash
npm run full
```
**Role**: Order txs, produce blocks, archive history.

**Optional**: Register as validator:

```bash
aztec add-l1-validator \
  --l1-rpc-urls $SEPOLIA_EL_RPC_URL \
  --private-key $VALIDATOR_KEY \
  --attester $NODE_MONIKER \
  --proposer-eoa $NODE_MONIKER \
  --staking-asset-handler <handler_address> \
  --l1-chain-id 11155111
```
*(Note: You'll need the correct `<handler_address>`)*

### Sequencer‑Only Node

```bash
npm run sequencer
```
**Role**: Order txs and build blocks without full history.

### Prover Node Stack

```bash
npm run prover
```
**Components**:
- Prover Node (coordinates proofs)
- Broker (distributes tasks)
- Agents (compute proofs)

**Resources**: ≥ 128 GB RAM, ≥ 16 cores recommended.

## Repository Structure

```bash
AZTEC-NODE-GUIDE/
├── docker/                     # Optional custom Compose files
│   ├── full-node.yml
│   ├── sequencer.yml
│   └── prover-stack.yml
├── scripts/
│   ├── setup.sh                # Installs deps & Aztec CLI
│   ├── check-deps.sh           # Verifies prerequisites
│   └── generate-env.sh         # (Optional) .env helper
├── .env.example                # Sample env file
├── .gitignore
├── LICENSE
├── package.json                # npm scripts: full, sequencer, prover
└── README.md                   # This file
```

## Advanced Configuration

**Edit Compose files**: Tweak `docker/*.yml` for custom ports, volumes, resource limits.

**Manual Compose**:

```bash
docker-compose -f docker/full-node.yml up -d
docker-compose -f docker/full-node.yml logs -f
docker-compose -f docker/full-node.yml down
```

## Troubleshooting

| Issue                     | Solution                                                                 |
| :------------------------ | :----------------------------------------------------------------------- |
| Permission denied         | Re-run `setup.sh` with `sudo` or add user to `docker` group.             |
| Docker not installed      | Confirm `docker --version`, then re-run `setup.sh`.                      |
| Aztec CLI missing         | Add to PATH: `export PATH="$HOME/.aztec/bin:$PATH"`. Run `source "$HOME/.aztec/env"`. |
| RPC URL errors            | Verify `.env` values and API keys. Ensure URLs are active.                |
| Port 40400 blocked        | Forward UDP/TCP in firewall/router. Check `EXTERNAL_IP`.                 |
| Prover resource limits    | Ensure host has ≥ 128 GB RAM and ≥ 16 CPU cores. This is expected.       |


## License

This project is licensed under the MIT License. See LICENSE for details.


## Disclaimer

For **alpha testnet use only**. Do **not** use mainnet credentials or assets. Use at your own risk.


## About Me

- Twitter: @SHASHI522004
- GitHub: cryptowithshashi
