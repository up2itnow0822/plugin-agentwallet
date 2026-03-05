"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.agentWalletPlugin = void 0;

const walletProvider = {
    get: async (runtime, message, state) => {
        const walletAddress = runtime.getSetting("AGENT_WALLET_ADDRESS");
        if (!walletAddress) return "Agent Wallet: Not configured.";
        return `Agent Wallet: ${walletAddress} (non-custodial, on-chain spend limits)`;
    },
};

const walletBalanceAction = {
    name: "WALLET_BALANCE",
    similes: ["CHECK_BALANCE", "GET_BALANCE", "WALLET_STATUS"],
    description: "Check the agent's non-custodial wallet balance (EVM + Solana)",
    validate: async (runtime) => !!(runtime.getSetting("AGENT_WALLET_ADDRESS") && runtime.getSetting("AGENT_PRIVATE_KEY")),
    handler: async (runtime, message, state, _options, callback) => {
        try {
            const { AgentWallet } = await import("agentwallet-sdk");
            const wallet = new AgentWallet({
                privateKey: runtime.getSetting("AGENT_PRIVATE_KEY"),
                walletAddress: runtime.getSetting("AGENT_WALLET_ADDRESS"),
                chainId: parseInt(runtime.getSetting("CHAIN_ID") || "8453"),
            });
            const balance = await wallet.getBalance();
            callback({ text: `Wallet balance: ${JSON.stringify(balance, null, 2)}` });
        } catch (error) {
            callback({ text: `Error: ${error.message}` });
        }
    },
    examples: [[
        { user: "user", content: { text: "What is my wallet balance?" } },
        { user: "agent", content: { text: "Checking your non-custodial wallet balance..." } }
    ]],
};

exports.agentWalletPlugin = {
    name: "plugin-agentwallet",
    description: "Non-custodial wallet for ElizaOS agents — EVM + Solana, x402 payments, 17-chain CCTP bridge, on-chain spend limits",
    providers: [walletProvider],
    actions: [walletBalanceAction],
    evaluators: [],
};
exports.default = exports.agentWalletPlugin;
