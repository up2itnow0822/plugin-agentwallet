# 🤖 Agent Wallet SDK

**Let your AI agent spend crypto. Stay in control.**

Agent Wallet gives AI agents autonomous spending power with hard on-chain limits. No more choosing between "agent can drain everything" and "every transaction needs manual approval."

```text
Agent wants to spend $15 → ✅ Auto-approved (under $25 limit)
Agent wants to spend $500 → ⏳ Queued for your approval
Agent spent $490 today → 🛑 Next tx queued ($500/day limit hit)
```text

## How We Compare

| | **agentwallet-sdk** | **Coinbase Agentic Wallet** | **MoonPay Agents** |
|---|---|---|---|
| **Custody** | Non-custodial (keys on device) | Semi-custodial (TEE) | Non-custodial (claimed) |
| **Spend Limits** | On-chain (smart contract) | API-enforced | Not documented |
| **Chains** | **17** (Base, ETH, Arb, Polygon + 12 EVM + **Solana**) | Base only | Unclear |
| **Agent Identity** | ERC-8004 + ERC-6551 | None | None |
| **Open Source** | MIT | Partial | Closed |
| **x402 Payments** | Native | Supported | "Compatible" |

> On-chain spend limits can't be bypassed even if the API layer is compromised. That's the difference between policy and math.

## Why Agent Wallet?

| Approach | Problem |
|----------|---------|
| Raw EOA wallet | Agent can drain everything. One prompt injection = rugged. |
| Multisig (Safe) | Every tx needs human sigs. Kills agent autonomy. |
| Custodial API (Stripe) | Centralized, KYC friction, not crypto-native. |
| **Agent Wallet** | **Agents spend freely within limits. Everything else queues for approval.** |

Built on **ERC-6551** (token-bound accounts). Your agent's wallet is tied to an NFT — portable, auditable, fully on-chain.

## Quick Start

```bash
npm install @agentwallet/sdk viem
```text

```typescript
import {
  createWallet,
  setSpendPolicy,
  agentExecute,
  checkBudget,
  getPendingApprovals,
  approveTransaction,
  NATIVE_TOKEN,
} from '@agentwallet/sdk';
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

// 1. Connect to your agent's wallet
const walletClient = createWalletClient({
  account: privateKeyToAccount('0xAGENT_PRIVATE_KEY'),
  transport: http('https://mainnet.base.org'),
});

const wallet = createWallet({
  accountAddress: '0xYOUR_AGENT_ACCOUNT',
  chain: 'base',
  walletClient,
});

// 2. Owner sets spending limits (one-time setup)
await setSpendPolicy(wallet, {
  token: NATIVE_TOKEN,  // ETH
  perTxLimit: 25_000000000000000n,   // 0.025 ETH per tx
  periodLimit: 500_000000000000000n, // 0.5 ETH per day
  periodLength: 86400,               // 24 hours
});

// 3. Agent spends autonomously
await agentExecute(wallet, {
  to: '0xSOME_SERVICE',
  value: 10_000000000000000n, // 0.01 ETH — under limit, executes immediately
});

// 4. Check remaining budget
const budget = await checkBudget(wallet, NATIVE_TOKEN);
console.log(`Remaining today: ${budget.remainingInPeriod}`);

// 5. Owner reviews queued transactions
const pending = await getPendingApprovals(wallet);
for (const tx of pending) {
  console.log(`Pending #${tx.txId}: ${tx.amount} to ${tx.to}`);
  await approveTransaction(wallet, tx.txId);
}
```text

## API Reference

### `createWallet(config)`

Connect to an existing AgentAccountV2 contract.

| Param | Type | Description |
|-------|------|-------------|
| `accountAddress` | `Address` | Deployed AgentAccountV2 address |
| `chain` | `string` | `'base'` \| `'base-sepolia'` \| `'ethereum'` \| `'arbitrum'` \| `'polygon'` |
| `walletClient` | `WalletClient` | viem wallet client (agent or owner key) |
| `rpcUrl?` | `string` | Custom RPC URL |

### `setSpendPolicy(wallet, policy)` — Owner only

Set per-token spending limits.

| Field | Type | Description |
|-------|------|-------------|
| `token` | `Address` | Token address (`NATIVE_TOKEN` for ETH) |
| `perTxLimit` | `bigint` | Max single tx (0 = all txs need approval) |
| `periodLimit` | `bigint` | Max per rolling window (0 = no autonomous spending) |
| `periodLength` | `number` | Window in seconds (default: 86400 = 24h) |

### `agentExecute(wallet, { to, value?, data? })`

Execute a native ETH transaction. Auto-approves if within limits, queues if over.

**Returns:** `{ executed: boolean, txHash: Hash, pendingTxId?: bigint }`

### `agentTransferToken(wallet, { token, to, amount })`

Transfer ERC20 tokens, respecting spend limits.

### `checkBudget(wallet, token?)`

Check remaining autonomous spending budget.

**Returns:** `{ token, perTxLimit, remainingInPeriod }`

### `getPendingApprovals(wallet, fromId?, toId?)`

List all pending (unexecuted, uncancelled) transactions awaiting owner approval.

### `approveTransaction(wallet, txId)` — Owner only

Approve and execute a queued transaction.

### `cancelTransaction(wallet, txId)` — Owner only

Cancel a queued transaction.

### `setOperator(wallet, operator, authorized)` — Owner only

Add or remove an agent operator address.

### `getBudgetForecast(wallet, token?, now?)`

**[MAX-ADDED]** Time-aware budget forecast — know not just what's left, but when it refills.

**Returns:** `BudgetForecast` — includes `remainingInPeriod`, `secondsUntilReset`, `utilizationPercent`, full period metadata.

```typescript
const forecast = await getBudgetForecast(wallet, NATIVE_TOKEN);
console.log(`${forecast.utilizationPercent}% used, resets in ${forecast.secondsUntilReset}s`);
```text

### `getWalletHealth(wallet, operators?, tokens?, now?)`

**[MAX-ADDED]** Single-call diagnostic snapshot for agent self-monitoring.

**Returns:** `WalletHealth` — address, NFT binding, operator epoch, active operator statuses, pending queue depth, budget forecasts.

```typescript
const health = await getWalletHealth(wallet, [agentHotWallet], [NATIVE_TOKEN, usdcAddress]);
if (health.pendingQueueDepth > 5) console.warn('Queue backing up!');
if (!health.activeOperators[0].active) console.error('Agent operator deactivated!');
```text

### `batchAgentTransfer(wallet, transfers)`

**[MAX-ADDED]** Execute multiple token transfers sequentially — reduces boilerplate for multi-recipient payments.

```typescript
const hashes = await batchAgentTransfer(wallet, [
  { token: USDC, to: serviceA, amount: 100n },
  { token: USDC, to: serviceB, amount: 200n },
]);
```text

### `getActivityHistory(wallet, { fromBlock?, toBlock? })`

**[MAX-ADDED]** Query on-chain event history for self-auditing — no external indexer needed.

**Returns:** `ActivityEntry[]` — sorted by block number, covers executions, queued txs, approvals, cancellations, policy updates, operator changes.

```typescript
const history = await getActivityHistory(wallet, { fromBlock: 10000n });
for (const entry of history) {
  console.log(`[${entry.type}] block ${entry.blockNumber}: ${JSON.stringify(entry.args)}`);
}
```text

## Supported Chains

### Wallet / Execution Chains

| Chain | Status | Best For |
|-------|--------|----------|
| **Base** | ✅ Primary | Low gas, USDC native |
| **Base Sepolia** | ✅ Testnet | Development |
| **Ethereum** | ✅ | High-value operations |
| **Arbitrum** | ✅ | DeFi agents |
| **Polygon** | ✅ | Micropayments |

### CCTP V2 Bridge — 17 Chains (v3.1.0)

Bridge USDC between any two supported chains via Circle's Cross-Chain Transfer Protocol V2. **0.1% platform fee.** Uses the same non-custodial, agent-native architecture.

```typescript
import { UnifiedBridge } from 'agentwallet-sdk';

const bridge = new UnifiedBridge({ evmSigner, solanaWallet });

// Bridge 1 USDC from Solana to Base (~20s fast transfer)
const result = await bridge.bridge({
  amount: 1_000_000n,       // 1 USDC (6 decimals)
  sourceChain: 'solana',
  destinationChain: 'base',
  destinationAddress: '0x...',
});
console.log('Minted on Base:', result.mintTxHash);

// Bridge from Polygon to Arbitrum
const result2 = await bridge.bridge({
  amount: 5_000_000n,       // 5 USDC
  sourceChain: 'polygon',
  destinationChain: 'arbitrum',
  destinationAddress: '0x...',
});

// Get a fee quote
const quote = bridge.getQuote({
  amount: 1_000_000n,
  sourceChain: 'base',
  destinationChain: 'sonic',
});
console.log(`Fee: ${quote.platformFee} USDC (0.1%)`);
console.log(`Est. time: ${quote.estimatedTimeSeconds}s`);
console.log(`Output: ${quote.outputAmount} USDC`);

// All 17 chains
console.log(bridge.getSupportedChains());
// ['ethereum','avalanche','optimism','arbitrum','base','polygon',
//  'unichain','linea','codex','sonic','worldchain','sei','xdc',
//  'hyperevm','ink','plume','solana']
```

#### Supported Bridge Chains

| Chain | CCTP Domain | Chain ID | Fast Transfer |
|-------|-------------|----------|---------------|
| Ethereum | 0 | 1 | ✅ ~20s |
| Avalanche | 1 | 43114 | ⏱ ~15min |
| OP Mainnet | 2 | 10 | ✅ ~20s |
| Arbitrum | 3 | 42161 | ✅ ~20s |
| **Solana** | 5 | — | ✅ ~20s |
| Base | 6 | 8453 | ✅ ~20s |
| Polygon PoS | 7 | 137 | ⏱ ~15min |
| Unichain | 10 | 130 | ✅ ~20s |
| Linea | 11 | 59144 | ✅ ~20s |
| Codex | 12 | 812 | ✅ ~20s |
| Sonic | 13 | 146 | ⏱ ~15min |
| World Chain | 14 | 480 | ✅ ~20s |
| Sei | 16 | 1329 | ⏱ ~15min |
| XDC | 18 | 50 | ⏱ ~15min |
| HyperEVM | 19 | 999 | ⏱ ~15min |
| Ink | 21 | 57073 | ✅ ~20s |
| Plume | 22 | 98866 | ✅ ~20s |

Contract addresses verified from Circle's official docs:
- **TokenMessengerV2**: `0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d` (all EVM chains)
- **MessageTransmitterV2**: `0x81D40F21F12A8F0E3252Bccb954D722d4c464B64` (all EVM chains)

#### EVM-Only Bridge (BridgeModule)

For EVM→EVM routes you can use `BridgeModule` directly (no Solana dependency):

```typescript
import { BridgeModule } from 'agentwallet-sdk';

const bridge = new BridgeModule(walletClient, 'base');
const result = await bridge.bridge(1_000_000n, 'polygon');
console.log('Minted on Polygon:', result.mintTxHash);
```

#### Solana-Side Operations (SolanaCCTPBridge)

```typescript
import { SolanaCCTPBridge } from 'agentwallet-sdk';
import { Connection, Keypair } from '@solana/web3.js';

const solanaBridge = new SolanaCCTPBridge({
  connection: new Connection('https://api.mainnet-beta.solana.com'),
  payer: keypair,
});

// Burn USDC on Solana → receive on Base
const burnResult = await solanaBridge.depositForBurn({
  amount: 1_000_000n,
  destinationChain: 'base',
  destinationAddress: '0x...',
});
const attestation = await solanaBridge.waitForAttestation(burnResult.messageHash);
// ... then call receiveMessage on Base
```

## x402 Protocol Support

Agent Wallet natively supports the [x402 protocol](https://x402.org) — the open standard for HTTP 402 machine payments. Your agent can automatically pay any x402-enabled API (Stripe, Coinbase, etc.) using USDC on Base, while respecting on-chain spend limits.

### Quick Start

```typescript
import { createWallet, createX402Client } from 'agentwallet-sdk';

// 1. Create your wallet
const wallet = createWallet({ accountAddress, chain: 'base', walletClient });

// 2. Create an x402-aware client
const client = createX402Client(wallet, {
  globalDailyLimit: 50_000_000n,  // 50 USDC/day
  globalPerRequestMax: 5_000_000n, // 5 USDC max per request
  serviceBudgets: [
    { service: 'api.weather.com', maxPerRequest: 1_000_000n, dailyLimit: 10_000_000n },
  ],
});

// 3. Use it like fetch — 402 responses are handled automatically
const response = await client.fetch('https://api.weather.com/forecast');
const data = await response.json();
// If the API returned 402, the client:
//   - Parsed payment requirements from the PAYMENT-REQUIRED header
//   - Checked your budget (client-side + on-chain)
//   - Paid USDC via your AgentWallet contract
//   - Retried the request with payment proof
```text

### Drop-in Fetch Replacement

```typescript
import { createX402Fetch } from 'agentwallet-sdk';

const x402Fetch = createX402Fetch(wallet, { globalDailyLimit: 100_000_000n });

// Use exactly like fetch()
const res = await x402Fetch('https://any-x402-api.com/endpoint');
```text

### Budget Controls

```typescript
// Check spending
const summary = client.getDailySpendSummary();
console.log(`Today's spend: ${summary.global} (resets at ${summary.resetsAt})`);

// View transaction log
const logs = client.getTransactionLog({ service: 'api.weather.com' });

// Add budget at runtime
client.budgetTracker.setServiceBudget({
  service: 'new-api.com',
  maxPerRequest: 2_000_000n,
  dailyLimit: 20_000_000n,
});
```text

### Payment Approval Callback

```typescript
const client = createX402Client(wallet, {
  onBeforePayment: async (req, url) => {
    console.log(`About to pay ${req.amount} to ${req.payTo} for ${url}`);
    return true; // return false to reject
  },
  onPaymentComplete: (log) => {
    console.log(`Paid ${log.amount} via tx ${log.txHash}`);
  },
});
```text

### How x402 Works

```text
Agent → GET /api/data → Server returns 402 + PAYMENT-REQUIRED header
  ↓
Client parses payment requirements (amount, token, recipient, network)
  ↓
Budget check (client-side caps + on-chain spend limits)
  ↓
AgentWallet executes USDC transfer on Base
  ↓
Client retries request with X-PAYMENT header (payment proof)
  ↓
Server verifies payment → returns 200 + data
```text

Your agent's keys never leave the non-custodial wallet. All payments respect on-chain spend limits set by the wallet owner.

## ERC-8004: On-Chain Agent Identity (v2.3.0)

Give your AI agent a portable, censorship-resistant identity on Ethereum via [ERC-8004 Trustless Agents](https://eips.ethereum.org/EIPS/eip-8004).

ERC-8004 provides three things:

- **Identity Registry** — ERC-721 NFT that resolves to an agent's registration file (name, description, services, capabilities)
- **Reputation Registry** — On-chain feedback signals (composable scoring)
- **Validation Registry** — Hooks for stakers, zkML verifiers, and TEE oracles

The SDK integrates the Identity Registry. Non-custodial — keys never leave the device.

```typescript
import { ERC8004Client, buildDataURI, validateRegistrationFile } from '@agentwallet/sdk';

const identity = new ERC8004Client({
  registryAddress: '0xYOUR_REGISTRY',
  chain: 'base',
});

// Register your agent on-chain (auto-builds data URI if you don't pass one)
const { txHash, agentId } = await identity.registerAgent(
  walletClient,
  {
    name: 'TradingAgent',
    description: 'Autonomous DeFi trading agent with x402 support',
    services: [
      { name: 'A2A', endpoint: 'https://agent.example/.well-known/agent-card.json', version: '0.3.0' },
      { name: 'MCP', endpoint: 'https://mcp.agent.example/', version: '2025-06-18' },
    ],
    x402Support: true,
    active: true,
    supportedTrust: ['reputation'],
  },
  'ipfs://QmYourCID'  // or omit to store fully on-chain as data URI
);

// Register the AI model powering this agent
await identity.setModelMetadata(walletClient, agentId!, {
  model: 'claude-3-5-sonnet',
  provider: 'anthropic',
  version: '2.3.0',
  capabilities: ['trading', 'research', 'payments'],
  framework: 'custom',
});

// Resolve any agent's full identity
const agentData = await identity.lookupAgentIdentity(42n);
console.log(agentData.registrationFile?.name);    // "TradingAgent"
console.log(agentData.modelMetadata?.model);       // "claude-3-5-sonnet"
console.log(agentData.owner);                      // NFT owner address

// Validate a registration file before publishing
const errors = validateRegistrationFile(agentData.registrationFile!);
if (errors.length === 0) console.log('Valid ERC-8004 registration ✅');
```text

### Agent Registry Identifier

Each agent is globally identified by a namespaced string:

```text
eip155:8453:0xRegistryAddress  ← namespace:chainId:contractAddress
```text

```typescript
import { formatAgentRegistry } from '@agentwallet/sdk';
const id = formatAgentRegistry(8453, '0xYOUR_REGISTRY');
// → "eip155:8453:0xYOUR_REGISTRY"
```text

### Fully On-Chain Storage (No IPFS Required)

```typescript
import { buildDataURI, parseDataURI } from '@agentwallet/sdk';

// Encode registration file as a base64 data URI (embeds in the NFT)
const uri = buildDataURI({ name: 'MyAgent', description: '...', type: '...' });
// → "data:application/json;base64,eyJ0eXBlIjoi..."

// Decode it back
const file = parseDataURI(uri);
```text

---

## How It Works

1. **Deploy** an AgentAccountV2 (ERC-6551 token-bound account tied to an NFT)
2. **Configure** spend policies per token — set per-tx and daily limits
3. **Register** your agent's hot wallet as an operator
4. **Register on-chain identity** via ERC-8004 (optional but recommended)
5. **Agent operates autonomously** — transactions within limits execute instantly
6. **Over-limit transactions queue** — owner gets notified, approves or cancels

All limits enforced on-chain. No off-chain dependencies. Fully auditable.

## Solana Support (v3.0.0)

Solana is now a first-class chain in the SDK. Unlike EVM chains, Solana uses Ed25519 keys, SPL tokens, and Jupiter for swaps — all fully supported.

### Install

```bash
npm install agentwallet-sdk @solana/web3.js @solana/spl-token
```

### SolanaWallet — Non-Custodial Agent Wallet

```typescript
import { SolanaWallet, SOLANA_USDC_MINT } from 'agentwallet-sdk';

// Generate a fresh keypair (ephemeral agent wallet)
const wallet = SolanaWallet.generate('https://api.mainnet-beta.solana.com');

// Or load from existing base58 private key
const wallet2 = SolanaWallet.fromBase58(process.env.SOLANA_PRIVATE_KEY!, 'https://api.mainnet-beta.solana.com');

// Get address (base58 public key)
console.log(wallet.getAddress());

// Check SOL balance (in lamports)
const lamports = await wallet.getBalance();
console.log(`${Number(lamports) / 1e9} SOL`);

// Check USDC balance (6 decimals)
const usdc = await wallet.getBalance(SOLANA_USDC_MINT);
console.log(`${Number(usdc) / 1e6} USDC`);

// Transfer SOL
const sig = await wallet.transfer({
  recipient: 'RecipientPubkey...',
  amount: 500_000_000n, // 0.5 SOL in lamports
});

// Transfer USDC
const sig2 = await wallet.transfer({
  recipient: 'RecipientPubkey...',
  amount: 5_000_000n,  // 5 USDC (6 decimals)
  mint: SOLANA_USDC_MINT,
});
```

### JupiterSwapClient — DEX Aggregator (Solana's Uniswap)

```typescript
import { SolanaWallet, JupiterSwapClient, SOLANA_USDC_MINT, SOL_NATIVE_MINT } from 'agentwallet-sdk';

const wallet = SolanaWallet.fromBase58(process.env.SOLANA_KEY!, 'https://api.mainnet-beta.solana.com');
const jupiter = new JupiterSwapClient({ wallet });

// Get a quote: SOL → USDC
const quote = await jupiter.getQuote(SOL_NATIVE_MINT, SOLANA_USDC_MINT, 1_000_000_000n);
console.log(`1 SOL ≈ ${Number(quote.outAmount) / 1e6} USDC`);

// Execute swap (0.875% platform fee, 0.5% default slippage)
const result = await jupiter.swapSolToUsdc(500_000_000n); // 0.5 SOL
console.log(`Swapped → tx: ${result.txSignature}`);

// Reverse: USDC → SOL
const result2 = await jupiter.swapUsdcToSol(100_000_000n); // 100 USDC
```

### SolanaX402Client — x402 Payments on Solana

```typescript
import { SolanaWallet, SolanaX402Client } from 'agentwallet-sdk';

const wallet = SolanaWallet.fromBase58(process.env.SOLANA_KEY!, 'https://api.mainnet-beta.solana.com');
const x402 = new SolanaX402Client(wallet);

// Check if this client can handle a network
x402.canHandle('solana:mainnet'); // true
x402.canHandle('base:8453');      // false

// Validate payment requirements before paying
const requirements = {
  scheme: 'exact',
  network: 'solana:mainnet' as const,
  asset: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
  amount: '1000000', // 1 USDC
  payTo: 'RecipientPubkey...',
  maxTimeoutSeconds: 300,
  extra: {},
};

const { valid, reason } = x402.validateRequirements(requirements, { maxAmount: 5_000_000n });
if (!valid) throw new Error(reason);

// Build signed proof (without broadcasting)
const proof = await x402.buildPaymentProof(requirements);
// proof.signedTransaction — base64 signed tx for x402 header

// Or pay directly (sign + broadcast)
const paidProof = await x402.pay(requirements);
console.log(`Paid! tx: ${paidProof.txSignature}`);
```

### Solana Chain Config

```typescript
import { SOLANA_CONFIG, getSolanaConfig } from 'agentwallet-sdk';

const mainnet = getSolanaConfig('solana');
// { cluster: 'mainnet-beta', rpcUrl: '...', usdcMint: 'EPjFWdd5...', x402Network: 'solana:mainnet' }

const devnet = getSolanaConfig('solana-devnet');
```

---

## Gas Sponsorship (v3.1.0)

Agents don't need to hold native gas tokens. Alchemy's ERC-4337 Gas Manager sponsors gas on their behalf.

**Requires:**
- An Alchemy API key with Gas Manager enabled
- A Gas Manager policy ID (create at [dashboard.alchemy.com/gas-manager](https://dashboard.alchemy.com/gas-manager))
- An ERC-4337 smart account for the agent (plain EOAs cannot use paymasters)

**Supported chains (6 of 17 CCTP chains):** `ethereum`, `base`, `arbitrum`, `optimism`, `polygon`, `worldchain`

```typescript
import { GasSponsor } from 'agentwallet-sdk';

const sponsor = new GasSponsor({
  alchemyApiKey: process.env.ALCHEMY_API_KEY!,
  policyId: process.env.ALCHEMY_GAS_POLICY_ID!, // from Alchemy dashboard
});

// Check support before attempting
if (sponsor.isSupported('base')) {
  const sponsored = await sponsor.sponsorTransaction({
    chain: 'base',
    from: agentSmartAccountAddress, // must be ERC-4337 smart account
    to: usdcContract,
    data: transferCalldata,
  });
  // Submit sponsored.userOperation to an ERC-4337 bundler
  // e.g. via eth_sendUserOperation
}

// Sponsor a bridge transaction
const sponsoredBridge = await sponsor.sponsorBridge({
  chain: 'optimism',
  from: agentSmartAccountAddress,
  bridgeTx: {
    to: TOKEN_MESSENGER_V2['optimism'],
    data: depositForBurnCalldata,
    value: 0n,
  },
});

// List all supported chains
const chains = sponsor.getSupportedChains();
// ['ethereum', 'base', 'arbitrum', 'optimism', 'polygon', 'worldchain']
```

---

## Settlement Verification (v3.1.0)

Verify that bridge transfers and x402 payments actually settled on-chain. Useful for agents that need to confirm receipt before proceeding.

```typescript
import { SettlementVerifier } from 'agentwallet-sdk';

const verifier = new SettlementVerifier({
  alchemyApiKey: process.env.ALCHEMY_API_KEY, // optional — falls back to public RPCs
});

// Verify any EVM transaction
const evmResult = await verifier.verifyEvmTransaction({
  chain: 'base',
  txHash: '0xabc123...',
  confirmations: 1, // default: 1
});
// { status: 'confirmed', blockNumber: 12345n, confirmations: 5, gasUsed: 21000n, success: true }

// Verify a Solana transaction
const solResult = await verifier.verifySolanaTransaction({
  signature: 'base58sig...',
  commitment: 'finalized', // 'confirmed' | 'finalized', default: 'confirmed'
});

// Verify a CCTP bridge transfer end-to-end
const bridgeResult = await verifier.verifyBridgeSettlement({
  sourceTxHash: '0xburntx...',
  sourceChain: 'base',         // or 'solana'
  destinationChain: 'arbitrum',
  expectedAmount: 1_000_000n,  // 1 USDC (6 decimals)
});
// { status: 'attestation_complete_awaiting_mint', sourceTx: {...}, attestationStatus: 'complete' }

// Verify an x402 payment via ERC20 Transfer event logs
const paymentResult = await verifier.verifyX402Payment({
  chain: 'base',
  txHash: '0xpaymenttx...',
  expectedPayee: '0xMerchantAddress',
  expectedAmount: 1_000_000n, // 1 USDC
});
// { status: 'confirmed', payeeVerified: true, amountVerified: true, actualAmount: 1000000n }
```

### Settlement Status Types

| Status | Meaning |
|--------|---------|
| `confirmed` | Transaction mined with required confirmations |
| `pending` | Transaction in mempool or not enough confirmations |
| `failed` | Transaction reverted (status=0) |
| `not_found` | Transaction not found or RPC error |

Bridge-specific statuses:

| Status | Meaning |
|--------|---------|
| `source_confirmed_awaiting_attestation` | Burn tx confirmed, Circle attestation pending |
| `attestation_complete_awaiting_mint` | Attestation ready, destination mint not yet verified |
| `complete` | Full bridge cycle confirmed |
| `source_failed` | Source burn transaction reverted |

---

## Fiat Onramp (Optional — v3.2.0)

> **This module is entirely opt-in. The core SDK is fully anonymous and non-custodial.**
> Users who fund their agent wallet via direct crypto transfer, bridge, or any other method
> **never encounter KYC** and remain completely anonymous.
> KYC only occurs when you explicitly choose to use the fiat onramp feature.

The `FiatOnramp` class aggregates multiple fiat-to-crypto providers (MoonPay, Stripe, Transak)
into a single interface. It returns a `purchaseUrl` — opening this URL takes the user to the
provider's hosted KYC + payment page. **The SDK never sees, stores, or transmits any KYC data.**

### Install

No additional packages needed — `FiatOnramp` is included in `agentwallet-sdk`.

Get API keys from the provider dashboards:

- **MoonPay:** https://dashboard.moonpay.com (publishable key)
- **Stripe:** https://dashboard.stripe.com (secret key — server-side only)
- **Transak:** https://dashboard.transak.com (API key)

### Usage

```typescript
import { FiatOnramp } from 'agentwallet-sdk';

// Only configure the providers you have keys for.
// Omitting all keys is valid — returns empty provider list with zero friction.
const onramp = new FiatOnramp({
  moonpayApiKey: process.env.MOONPAY_API_KEY,
  transakApiKey: process.env.TRANSAK_API_KEY,
});

// Get quotes from all configured providers that support base/USDC
const quotes = await onramp.getQuotes({
  amount: 100,
  currency: 'USD',
  token: 'USDC',
  chain: 'base',
  walletAddress: '0xYourAgentWalletAddress',
});

// quotes[0].kycRequired is always true — KYC happens on the provider's hosted page
console.log(quotes[0].purchaseUrl); // Open this URL in a browser to complete purchase

// Or target a specific provider
const session = await onramp.createSession({
  amount: 100,
  currency: 'USD',
  token: 'USDC',
  chain: 'base',
  walletAddress: '0xYourAgentWalletAddress',
  provider: 'moonpay',
  redirectUrl: 'https://yourapp.com/done', // optional
});

console.log(session.purchaseUrl); // MoonPay hosted KYC + payment page
console.log(session.feeAmount);   // e.g., 2.50
console.log(session.feePercent);  // e.g., 2.5
```

### Supported Chains & Tokens

| Provider | Chains | Tokens |
|----------|--------|--------|
| MoonPay  | ethereum, base, solana, polygon, arbitrum, optimism | ETH, USDC, USDT, SOL, MATIC |
| Stripe   | ethereum, base, solana, polygon, arbitrum, optimism | ETH, USDC, SOL, MATIC |
| Transak  | ethereum, base, solana, polygon, arbitrum, optimism, avalanche, bsc | ETH, USDC, USDT, SOL, MATIC, AVAX, BNB |

### API

```typescript
// Get quotes from all configured providers
getQuotes(params: OnrampParams): Promise<FiatQuote[]>

// Create a session with a specific provider
createSession(params: OnrampParams & { provider: string }): Promise<FiatQuote>

// Check if a provider supports a chain/token combo
isSupported(provider: string, chain: string, token: string): boolean

// Get configured provider names
getProviders(): string[]

// Get supported chains for a provider
getSupportedChains(provider: string): string[]

// Get supported tokens on a chain for a provider
getSupportedTokens(provider: string, chain: string): string[]
```

### Privacy Guarantee

- The SDK **never** collects, stores, or transmits KYC data
- The SDK **never** stores payment info (no card numbers, no bank accounts)
- KYC + payment happen entirely on the provider's hosted page
- Direct crypto funding (transfer, bridge, swap) = fully anonymous, no KYC, ever

---

## License

MIT
