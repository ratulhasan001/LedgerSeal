# LedgerSeal

LedgerSeal is a decentralized file-verification app. It records a SHA-256 fingerprint of a file on an EVM blockchain and pins the file itself to IPFS. Later, anyone can drop the same file into the app and prove it is byte-for-byte identical to the registered original, see who registered it, and when.

Write access is role-based: only accounts with the **Uploader** role can register files, and only **Admins** can grant or revoke that role. Verification is open to everyone and needs no wallet.

## Features

- **Register files.** The file is hashed in the browser, pinned to IPFS through Pinata, and its fingerprint and CID are stored on-chain.
- **Verify files.** Drop in any file to check whether its fingerprint is registered. If it is, you see the uploader, the timestamp and a link to the IPFS copy.
- **Role-based access.** Built on OpenZeppelin `AccessControl`, with Admin and Uploader roles.
- **Admin panel.** Grant or revoke the Uploader role from the UI, and see whether an address already holds it.
- **Duplicate protection.** The app checks the registry before uploading, and the contract rejects a fingerprint that is already registered.
- **Upload progress.** Shows percentage, transfer speed and estimated time remaining.
- **Light and dark themes.** The app follows your system theme, and you can switch it manually.

## How it works

```
 ┌──────────┐   SHA-256 (Web Crypto)   ┌──────────────┐
 │   File   │ ───────────────────────▶ │  bytes32 hash│
 └────┬─────┘                          └──────┬───────┘
      │ pin                                   │ storeHash(hash, cid)
      ▼                                       ▼
 ┌──────────┐        CID              ┌──────────────────┐
 │  Pinata  │ ──────────────────────▶ │ FileStorage.sol  │
 │  (IPFS)  │                         │ hash → {uploader,│
 └──────────┘                         │  timestamp, cid} │
                                      └──────────────────┘
```

Verification hashes the file locally and calls `getRecord(hash)`. The file never leaves the browser during verification.

## Tech stack

| Layer          | Tools                                                    |
| -------------- | -------------------------------------------------------- |
| Smart contract | Solidity 0.8.24, OpenZeppelin Contracts v5, Foundry      |
| Frontend       | React 19, Vite 6, ethers v6, axios                       |
| Storage        | IPFS via Pinata                                          |
| Wallet         | MetaMask or any EIP-1193 browser wallet                  |

## Project structure

```
LedgerSeal/
├── contracts/                 Foundry project
│   ├── src/FileStorage.sol    Registry contract
│   ├── test/FileStorage.t.sol Unit and fuzz tests
│   ├── script/Deploy.s.sol    Deployment script
│   └── lib/                   forge-std, openzeppelin-contracts
└── frontend/                  React + Vite app
    ├── .env.example
    └── src/
        ├── components/        Header, UploadPanel, VerifyPanel, AdminPanel, ...
        ├── hooks/             useWallet, useTheme
        ├── lib/               contract ABI, hashing, Pinata client, formatting
        └── config.js          Environment configuration
```

## Getting started

### Prerequisites

- [Foundry](https://book.getfoundry.sh/getting-started/installation) (`forge`, `anvil`)
- Node.js 18 or later and npm
- A browser wallet such as [MetaMask](https://metamask.io/)
- A [Pinata](https://app.pinata.cloud/) account for IPFS uploads (only needed to register files)

### 1. Build and test the contract

```bash
cd contracts
forge build
forge test
```

### 2. Deploy

**Local network (Anvil)**

Start a local chain in a separate terminal:

```bash
anvil
```

Then deploy using one of the funded accounts Anvil prints on startup:

```bash
cd contracts
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url http://127.0.0.1:8545 \
  --private-key <ANVIL_PRIVATE_KEY> \
  --broadcast
```

The script logs the deployed address. The deploying account receives both the Admin and the Uploader role.

To use the app against Anvil, add a network to MetaMask with RPC URL `http://127.0.0.1:8545` and chain ID `31337`, then import the same private key.

**Testnet (for example Sepolia)**

```bash
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url $SEPOLIA_RPC_URL \
  --account <keystore-account> \
  --broadcast
```

### 3. Configure the frontend

```bash
cd frontend
cp .env.example .env
```

| Variable                     | Description                                                               |
| ---------------------------- | ------------------------------------------------------------------------- |
| `VITE_CONTRACT_ADDRESS`      | Address of the deployed `FileStorage` contract (required)                 |
| `VITE_RPC_URL`               | RPC used for read-only mode when no wallet is installed                   |
| `VITE_PINATA_JWT`            | Pinata JWT (preferred)                                                    |
| `VITE_PINATA_API_KEY`        | Pinata API key, used only if no JWT is set                                |
| `VITE_PINATA_SECRET_API_KEY` | Pinata API secret, used only if no JWT is set                             |
| `VITE_IPFS_GATEWAY`          | Gateway used for file links (default `https://gateway.pinata.cloud/ipfs`) |

### 4. Run the app

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually http://localhost:5173) and connect your wallet.

Other scripts:

```bash
npm run build     # production build in dist/
npm run preview   # serve the production build
npm run lint      # ESLint
```

## Usage

1. **Connect** your wallet. Your roles appear in the top bar.
2. **Register a file** (Uploader role required): choose a file, click **Upload & register**, and confirm the transaction.
3. **Verify a file**: choose a file in the Verify panel. The result appears immediately.
4. **Manage uploaders** (Admin only): enter an address and click **Grant** or **Revoke**.

## Contract reference

`FileStorage` inherits OpenZeppelin `AccessControl`.

| Function                                          | Access         | Description                                     |
| ------------------------------------------------- | -------------- | ----------------------------------------------- |
| `storeHash(bytes32 fileHash, string cid)`         | `UPLOADER_ROLE` | Registers a fingerprint and its IPFS CID        |
| `isHashStored(bytes32 fileHash) → bool`           | public         | Whether the fingerprint is registered           |
| `getRecord(bytes32 fileHash) → Record`            | public         | `{ uploader, timestamp, cid }` for the fingerprint |
| `grantUploaderRole(address account)`              | `DEFAULT_ADMIN_ROLE` | Grants the Uploader role                  |
| `revokeUploaderRole(address account)`             | `DEFAULT_ADMIN_ROLE` | Revokes the Uploader role                 |

**Event:** `HashStored(bytes32 indexed fileHash, address indexed uploader, string cid)`

**Errors:** `EmptyHash()`, `HashAlreadyStored(bytes32)`, `ZeroAddress()`, plus OpenZeppelin's `AccessControlUnauthorizedAccount`.

## Security notes

- Every `VITE_*` variable is bundled into the client and visible to anyone using the app. Use a Pinata key scoped to `pinFileToIPFS` only. For a public deployment, move uploads behind a small backend that keeps the credentials server-side.
- Files pinned to IPFS are public. Do not register confidential files unless you encrypt them first. The on-chain fingerprint alone reveals nothing about a file's contents.
- The deployer is the only Admin at first. Consider transferring `DEFAULT_ADMIN_ROLE` to a multisig for production.

## Related publication

The document-verification design behind LedgerSeal is described in:

> R. Hasan, S. Farjana, Y. Oley, M. O. Pranto and M. A. Rayhan, "A Gas-Optimized Blockchain Framework for Scalable Document Verification Using Dynamic Access Control and IPFS," *International Conference on Power, Electronics, Communications, Computing, and Intelligent Infrastructure (PECCII 2026)*, IEEE, 2026. doi: [10.1109/PECCII70991.2026.11662071](https://doi.org/10.1109/PECCII70991.2026.11662071)

This repository contains the single-document registry contract, its Foundry test suite and the React client. Gas figures reported in the paper come from the paper's own benchmark setup.

## License

[MIT](LICENSE)

---

Ratul Hasan · [ratulhasan.dev](https://ratulhasan.dev)
