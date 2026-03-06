import { ProviderV1, LanguageModelV1, EmbeddingModelV1 } from '@ai-sdk/provider';
import { BedrockRuntimeClientConfig } from '@aws-sdk/client-bedrock-runtime';

type BedrockChatModelId = 'amazon.titan-tg1-large' | 'amazon.titan-text-express-v1' | 'anthropic.claude-v2' | 'anthropic.claude-v2:1' | 'anthropic.claude-instant-v1' | 'anthropic.claude-3-5-sonnet-20240620-v1:0' | 'anthropic.claude-3-5-sonnet-20241022-v2:0' | 'anthropic.claude-3-5-haiku-20241022-v1:0' | 'anthropic.claude-3-sonnet-20240229-v1:0' | 'anthropic.claude-3-haiku-20240307-v1:0' | 'anthropic.claude-3-opus-20240229-v1:0' | 'cohere.command-text-v14' | 'cohere.command-light-text-v14' | 'cohere.command-r-v1:0' | 'cohere.command-r-plus-v1:0' | 'meta.llama3-70b-instruct-v1:0' | 'meta.llama3-8b-instruct-v1:0' | 'meta.llama3-1-405b-instruct-v1:0' | 'meta.llama3-1-70b-instruct-v1:0' | 'meta.llama3-1-8b-instruct-v1:0' | 'meta.llama3-2-11b-instruct-v1:0' | 'meta.llama3-2-1b-instruct-v1:0' | 'meta.llama3-2-3b-instruct-v1:0' | 'meta.llama3-2-90b-instruct-v1:0' | 'mistral.mistral-7b-instruct-v0:2' | 'mistral.mixtral-8x7b-instruct-v0:1' | 'mistral.mistral-large-2402-v1:0' | 'mistral.mistral-small-2402-v1:0' | 'amazon.titan-text-express-v1' | 'amazon.titan-text-lite-v1' | (string & {});
interface BedrockChatSettings {
    /**
  Additional inference parameters that the model supports,
  beyond the base set of inference parameters that Converse
  supports in the inferenceConfig field
  */
    additionalModelRequestFields?: Record<string, any>;
}

type BedrockEmbeddingModelId = 'amazon.titan-embed-text-v1' | 'amazon.titan-embed-text-v2:0' | 'cohere.embed-english-v3' | 'cohere.embed-multilingual-v3' | (string & {});
interface BedrockEmbeddingSettings {
    /**
  The number of dimensions the resulting output embeddings should have (defaults to 1024).
  Only supported in amazon.titan-embed-text-v2:0.
     */
    dimensions?: 1024 | 512 | 256;
    /**
  Flag indicating whether or not to normalize the output embeddings. Defaults to true
  Only supported in amazon.titan-embed-text-v2:0.
     */
    normalize?: boolean;
}

interface AmazonBedrockProviderSettings {
    region?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    sessionToken?: string;
    /**
     * Complete Bedrock configuration for setting advanced authentication and
     * other options. When this is provided, the region, accessKeyId, and
     * secretAccessKey settings are ignored.
     */
    bedrockOptions?: BedrockRuntimeClientConfig;
    generateId?: () => string;
}
interface AmazonBedrockProvider extends ProviderV1 {
    (modelId: BedrockChatModelId, settings?: BedrockChatSettings): LanguageModelV1;
    languageModel(modelId: BedrockChatModelId, settings?: BedrockChatSettings): LanguageModelV1;
    embedding(modelId: BedrockEmbeddingModelId, settings?: BedrockEmbeddingSettings): EmbeddingModelV1<string>;
}
/**
Create an Amazon Bedrock provider instance.
 */
declare function createAmazonBedrock(options?: AmazonBedrockProviderSettings): AmazonBedrockProvider;
/**
Default Bedrock provider instance.
 */
declare const bedrock: AmazonBedrockProvider;

export { type AmazonBedrockProvider, type AmazonBedrockProviderSettings, bedrock, createAmazonBedrock };
