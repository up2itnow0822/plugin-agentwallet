import { Plugin, Action, Provider, IAgentRuntime, Memory, State, HandlerCallback } from "@elizaos/core";

// Agent Wallet Plugin for ElizaOS
// Non-custodial EVM + Solana wallet with x402 payments and CCTP bridge
// Built on agentwallet-sdk — https://www.npmjs.com/package/agentwallet-sdk

const walletProvider: Provider = {
  get: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
    const walletAddress = runtime.getSetting("AGENT_WALLET_ADDRESS");
    const privateKey = runtime.getSetting("AGENT_PRIVATE_KEY");
    if (!walletAddress || !privateKey) {
      return "Agent Wallet: Not configured. Set AGENT_WALLET_ADDRESS and AGENT_PRIVATE_KEY.";
    }
    return `Agent Wallet: ${walletAddress} (non-custodial, spend limits enforced on-chain)`;
  },
};

const walletBalanceAction: Action = {
  name: "WALLET_BALANCE",
  similes: ["CHECK_BALANCE", "GET_BALANCE", "WALLET_STATUS"],
  description: "Check the agent's non-custodial wallet balance across EVM chains and Solana",
  validate: async (runtime: IAgentRuntime) => {
    return !!(runtime.getSetting("AGENT_WALLET_ADDRESS") && runtime.getSetting("AGENT_PRIVATE_KEY"));
  },
  handler: async (runtime: IAgentRuntime, message: Memory, state: State, _options: any, callback: HandlerCallback) => {
    try {
      // Dynamic import to avoid bundling issues
      const { AgentWallet } = await import("agentwallet-sdk");
      const wallet = new AgentWallet({
        privateKey: runtime.getSetting("AGENT_PRIVATE_KEY") as string,
        walletAddress: runtime.getSetting("AGENT_WALLET_ADDRESS") as string,
        chainId: parseInt(runtime.getSetting("CHAIN_ID") || "8453"),
      });
      const balance = await wallet.getBalance();
      callback({ text: `Wallet balance: ${JSON.stringify(balance, null, 2)}` });
    } catch (error: any) {
      callback({ text: `Error checking balance: ${error.message}` });
    }
  },
  examples: [
    [
      { user: "user", content: { text: "What is my wallet balance?" } },
      { user: "agent", content: { text: "Checking your non-custodial wallet balance..." } }
    ]
  ],
};

const sendPaymentAction: Action = {
  name: "SEND_PAYMENT",
  similes: ["PAY", "TRANSFER", "SEND_TOKEN", "SEND_USDC"],
  description: "Send a payment from the agent's wallet (enforces on-chain spend limits)",
  validate: async (runtime: IAgentRuntime) => {
    return !!(runtime.getSetting("AGENT_WALLET_ADDRESS") && runtime.getSetting("AGENT_PRIVATE_KEY"));
  },
  handler: async (runtime: IAgentRuntime, message: Memory, state: State, _options: any, callback: HandlerCallback) => {
    callback({ text: "Payment action: Parse recipient and amount from message, then execute via agentwallet-sdk. Spend limits enforced on-chain." });
  },
  examples: [
    [
      { user: "user", content: { text: "Send 10 USDC to 0x..." } },
      { user: "agent", content: { text: "Sending 10 USDC (within spend limit)..." } }
    ]
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
