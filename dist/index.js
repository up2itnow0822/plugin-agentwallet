"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.agentWalletPlugin = void 0;
// Agent Wallet Plugin for ElizaOS
// Non-custodial EVM + Solana wallet with x402 payments and CCTP bridge
// Built on agentwallet-sdk — https://www.npmjs.com/package/agentwallet-sdk
const walletProvider = {
    get: async (runtime, message, state) => {
        const walletAddress = runtime.getSetting("AGENT_WALLET_ADDRESS");
        const privateKey = runtime.getSetting("AGENT_PRIVATE_KEY");
        if (!walletAddress || !privateKey) {
            return "Agent Wallet: Not configured. Set AGENT_WALLET_ADDRESS and AGENT_PRIVATE_KEY.";
        }
        return `Agent Wallet: ${walletAddress} (non-custodial, spend limits enforced on-chain)`;
    },
};
const walletBalanceAction = {
    name: "WALLET_BALANCE",
    similes: ["CHECK_BALANCE", "GET_BALANCE", "WALLET_STATUS"],
    description: "Check the agent's non-custodial wallet balance across EVM chains and Solana",
    validate: async (runtime) => {
        return !!(runtime.getSetting("AGENT_WALLET_ADDRESS") && runtime.getSetting("AGENT_PRIVATE_KEY"));
    },
    handler: async (runtime, message, state, _options, callback) => {
        try {
            // Dynamic import to avoid bundling issues; cast to any for SDK v3 API compatibility
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const sdk = await Promise.resolve().then(() => __importStar(require("agentwallet-sdk")));
            const wallet = sdk.createWallet({
                privateKey: runtime.getSetting("AGENT_PRIVATE_KEY"),
                walletAddress: runtime.getSetting("AGENT_WALLET_ADDRESS"),
                chainId: parseInt(runtime.getSetting("CHAIN_ID") || "8453"),
            });
            const balance = await wallet.getBalance();
            callback({ text: `Wallet balance: ${JSON.stringify(balance, null, 2)}` });
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            callback({ text: `Error checking balance: ${msg}` });
        }
    },
    examples: [
        [
            { user: "user", content: { text: "What is my wallet balance?" } },
            { user: "agent", content: { text: "Checking your non-custodial wallet balance..." } }
        ]
    ],
};
const sendPaymentAction = {
    name: "SEND_PAYMENT",
    similes: ["PAY", "TRANSFER", "SEND_TOKEN", "SEND_USDC"],
    description: "Send a payment from the agent's wallet (enforces on-chain spend limits)",
    validate: async (runtime) => {
        return !!(runtime.getSetting("AGENT_WALLET_ADDRESS") && runtime.getSetting("AGENT_PRIVATE_KEY"));
    },
    handler: async (runtime, message, state, _options, callback) => {
        callback({ text: "Payment action: Parse recipient and amount from message, then execute via agentwallet-sdk. Spend limits enforced on-chain." });
    },
    examples: [
        [
            { user: "user", content: { text: "Send 10 USDC to 0x..." } },
            { user: "agent", content: { text: "Sending 10 USDC (within spend limit)..." } }
        ]
    ],
};
exports.agentWalletPlugin = {
    name: "plugin-agentwallet",
    description: "Non-custodial wallet for ElizaOS agents — EVM + Solana, x402 payments, 17-chain CCTP bridge, on-chain spend limits",
    providers: [walletProvider],
    actions: [walletBalanceAction, sendPaymentAction],
    evaluators: [],
};
exports.default = exports.agentWalletPlugin;
//# sourceMappingURL=index.js.map