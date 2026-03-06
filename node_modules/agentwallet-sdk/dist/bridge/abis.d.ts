/**
 * CCTP V2 TokenMessengerV2 ABI (source chain)
 * Key function: depositForBurn — burns USDC and emits a MessageSent event
 */
export declare const TokenMessengerV2Abi: {
    name: string;
    type: string;
    stateMutability: string;
    inputs: {
        name: string;
        type: string;
    }[];
    outputs: {
        name: string;
        type: string;
    }[];
}[];
/**
 * CCTP V2 MessageTransmitterV2 ABI (destination chain)
 * Key function: receiveMessage — mints USDC using attested message
 */
export declare const MessageTransmitterV2Abi: {
    name: string;
    type: string;
    stateMutability: string;
    inputs: {
        name: string;
        type: string;
    }[];
    outputs: {
        name: string;
        type: string;
    }[];
}[];
/**
 * Minimal ERC20 ABI — approve + allowance + balanceOf
 */
export declare const ERC20BridgeAbi: {
    name: string;
    type: string;
    stateMutability: string;
    inputs: {
        name: string;
        type: string;
    }[];
    outputs: {
        name: string;
        type: string;
    }[];
}[];
/**
 * MessageTransmitter MessageSent event ABI — emitted during depositForBurn
 * Used to extract the CCTP message bytes and hash for attestation polling.
 */
export declare const MessageSentEventAbi: {
    name: string;
    type: string;
    inputs: {
        name: string;
        type: string;
        indexed: boolean;
    }[];
}[];
//# sourceMappingURL=abis.d.ts.map