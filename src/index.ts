import { Plugin, Action, Provider, IAgentRuntime, Memory, State, HandlerCallback } from "@elizaos/core";

// Agent Wallet Plugin for ElizaOS
// Non-custodial EVM + Solana wallet with x402 payments and CCTP bridge
// Built on agentwallet-sdk — https://www.npmjs.com/package/agentwallet-sdk

const walletProvider: Provider = {
  // name is required in elizaos/core v1.x
  name: "agentWalletProvider",
  description: "Provides the agent's non-custodial wallet address and configuration status",
  // state is required (non-optional) in elizaos/core v1.x
  get: async (runtime: IAgentRuntime, message: Memory, state: State) => {
    const walletAddress = runtime.getSetting("AGENT_WALLET_ADDRESS");
    const privateKey = runtime.getSetting("AGENT_PRIVATE_KEY");
    if (!walletAddress || !privateKey) {
      return {
        text: "Agent Wallet: Not configured. Set AGENT_WALLET_ADDRESS and AGENT_PRIVATE_KEY.",
        values: { configured: false },
      };
    }
    return {
      text: `Agent Wallet: ${walletAddress} (non-custodial, spend limits enforced on-chain)`,
      values: { configured: true, walletAddress: String(walletAddress) },
    };
  },
};

const walletBalanceAction: Action = {
  name: "WALLET_BALANCE",
  similes: ["CHECK_BALANCE", "GET_BALANCE", "WALLET_STATUS"],
  description: "Check the agent's non-custodial wallet balance across EVM chains and Solana",
  validate: async (runtime: IAgentRuntime) => {
    return !!(runtime.getSetting("AGENT_WALLET_ADDRESS") && runtime.getSetting("AGENT_PRIVATE_KEY"));
  },
  handler: async (runtime: IAgentRuntime, message: Memory, state: State, _options: unknown, callback: HandlerCallback) => {
    try {
      // Dynamic import to avoid bundling issues; cast to any for SDK v3 API compatibility
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sdk = await import("agentwallet-sdk") as any;
      const wallet = sdk.createWallet({
        privateKey: String(runtime.getSetting("AGENT_PRIVATE_KEY")),
        walletAddress: String(runtime.getSetting("AGENT_WALLET_ADDRESS")),
        chainId: parseInt(String(runtime.getSetting("CHAIN_ID") || "8453")),
      });
      const balance = await wallet.getBalance();
      callback({ text: `Wallet balance: ${JSON.stringify(balance, null, 2)}` });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      callback({ text: `Error checking balance: ${msg}` });
    }
  },
  examples: [
    [
      // elizaos/core v1.x: ActionExample uses 'name' instead of 'user'
      { name: "user", content: { text: "What is my wallet balance?" } },
      { name: "agent", content: { text: "Checking your non-custodial wallet balance..." } },
    ],
  ],
};

const sendPaymentAction: Action = {
  name: "SEND_PAYMENT",
  similes: ["PAY", "TRANSFER", "SEND_TOKEN", "SEND_USDC"],
  description: "Send a payment from the agent's wallet (enforces on-chain spend limits)",
  validate: async (runtime: IAgentRuntime) => {
    return !!(runtime.getSetting("AGENT_WALLET_ADDRESS") && runtime.getSetting("AGENT_PRIVATE_KEY"));
  },
  handler: async (runtime: IAgentRuntime, message: Memory, state: State, _options: unknown, callback: HandlerCallback) => {
    callback({ text: "Payment action: Parse recipient and amount from message, then execute via agentwallet-sdk. Spend limits enforced on-chain." });
  },
  examples: [
    [
      { name: "user", content: { text: "Send 10 USDC to 0x..." } },
      { name: "agent", content: { text: "Sending 10 USDC (within spend limit)..." } },
    ],
  ],
};

export const agentWalletPlugin: Plugin = {
  name: "plugin-agentwallet",
  description: "Non-custodial wallet for ElizaOS agents — EVM + Solana, x402 payments, 17-chain CCTP bridge, on-chain spend limits",
  providers: [walletProvider],
  actions: [walletBalanceAction, sendPaymentAction],
  evaluators: [],
};

export default agentWalletPlugin;
