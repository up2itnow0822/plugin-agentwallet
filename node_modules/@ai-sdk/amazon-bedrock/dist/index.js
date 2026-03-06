"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  bedrock: () => bedrock,
  createAmazonBedrock: () => createAmazonBedrock
});
module.exports = __toCommonJS(src_exports);

// src/bedrock-provider.ts
var import_provider_utils2 = require("@ai-sdk/provider-utils");
var import_client_bedrock_runtime3 = require("@aws-sdk/client-bedrock-runtime");

// src/bedrock-chat-language-model.ts
var import_provider3 = require("@ai-sdk/provider");
var import_client_bedrock_runtime = require("@aws-sdk/client-bedrock-runtime");

// src/bedrock-prepare-tools.ts
var import_provider = require("@ai-sdk/provider");
function prepareTools(mode) {
  var _a;
  const tools = ((_a = mode.tools) == null ? void 0 : _a.length) ? mode.tools : void 0;
  if (tools == null) {
    return {
      toolConfig: { tools: void 0, toolChoice: void 0 },
      toolWarnings: []
    };
  }
  const toolWarnings = [];
  const bedrockTools = [];
  for (const tool of tools) {
    if (tool.type === "provider-defined") {
      toolWarnings.push({ type: "unsupported-tool", tool });
    } else {
      bedrockTools.push({
        toolSpec: {
          name: tool.name,
          description: tool.description,
          inputSchema: {
            json: tool.parameters
          }
        }
      });
    }
  }
  const toolChoice = mode.toolChoice;
  if (toolChoice == null) {
    return {
      toolConfig: { tools: bedrockTools, toolChoice: void 0 },
      toolWarnings
    };
  }
  const type = toolChoice.type;
  switch (type) {
    case "auto":
      return {
        toolConfig: { tools: bedrockTools, toolChoice: { auto: {} } },
        toolWarnings
      };
    case "required":
      return {
        toolConfig: { tools: bedrockTools, toolChoice: { any: {} } },
        toolWarnings
      };
    case "none":
      return {
        toolConfig: { tools: void 0, toolChoice: void 0 },
        toolWarnings
      };
    case "tool":
      return {
        toolConfig: {
          tools: bedrockTools,
          toolChoice: { tool: { name: toolChoice.toolName } }
        },
        toolWarnings
      };
    default: {
      const _exhaustiveCheck = type;
      throw new import_provider.UnsupportedFunctionalityError({
        functionality: `Unsupported tool choice type: ${_exhaustiveCheck}`
      });
    }
  }
}

// src/convert-to-bedrock-chat-messages.ts
var import_provider2 = require("@ai-sdk/provider");
var import_provider_utils = require("@ai-sdk/provider-utils");
var generateFileId = (0, import_provider_utils.createIdGenerator)({ prefix: "file", size: 16 });
function convertToBedrockChatMessages(prompt) {
  var _a, _b, _c, _d, _e;
  const blocks = groupIntoBlocks(prompt);
  let system = void 0;
  const messages = [];
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const isLastBlock = i === blocks.length - 1;
    const type = block.type;
    switch (type) {
      case "system": {
        if (messages.length > 0) {
          throw new import_provider2.UnsupportedFunctionalityError({
            functionality: "Multiple system messages that are separated by user/assistant messages"
          });
        }
        system = block.messages.map(({ content }) => content).join("\n");
        break;
      }
      case "user": {
        const bedrockContent = [];
        for (const message of block.messages) {
          const { role, content } = message;
          switch (role) {
            case "user": {
              for (let j = 0; j < content.length; j++) {
                const part = content[j];
                switch (part.type) {
                  case "text": {
                    bedrockContent.push({
                      text: part.text
                    });
                    break;
                  }
                  case "image": {
                    if (part.image instanceof URL) {
                      throw new import_provider2.UnsupportedFunctionalityError({
                        functionality: "Image URLs in user messages"
                      });
                    }
                    bedrockContent.push({
                      image: {
                        format: (_b = (_a = part.mimeType) == null ? void 0 : _a.split("/")) == null ? void 0 : _b[1],
                        source: {
                          bytes: (_c = part.image) != null ? _c : part.image
                        }
                      }
                    });
                    break;
                  }
                  case "file": {
                    if (part.data instanceof URL) {
                      throw new import_provider2.UnsupportedFunctionalityError({
                        functionality: "File URLs in user messages"
                      });
                    }
                    bedrockContent.push({
                      document: {
                        format: (_e = (_d = part.mimeType) == null ? void 0 : _d.split(
                          "/"
                        )) == null ? void 0 : _e[1],
                        name: generateFileId(),
                        source: {
                          bytes: Buffer.from(part.data, "base64")
                        }
                      }
                    });
                    break;
                  }
                }
              }
              break;
            }
            case "tool": {
              for (let i2 = 0; i2 < content.length; i2++) {
                const part = content[i2];
                bedrockContent.push({
                  toolResult: {
                    toolUseId: part.toolCallId,
                    content: [{ text: JSON.stringify(part.result) }]
                  }
                });
              }
              break;
            }
            default: {
              const _exhaustiveCheck = role;
              throw new Error(`Unsupported role: ${_exhaustiveCheck}`);
            }
          }
        }
        messages.push({ role: "user", content: bedrockContent });
        break;
      }
      case "assistant": {
        const bedrockContent = [];
        for (let j = 0; j < block.messages.length; j++) {
          const message = block.messages[j];
          const isLastMessage = j === block.messages.length - 1;
          const { content } = message;
          for (let k = 0; k < content.length; k++) {
            const part = content[k];
            const isLastContentPart = k === content.length - 1;
            switch (part.type) {
              case "text": {
                bedrockContent.push({
                  text: (
                    // trim the last text part if it's the last message in the block
                    // because Bedrock does not allow trailing whitespace
                    // in pre-filled assistant responses
                    isLastBlock && isLastMessage && isLastContentPart ? part.text.trim() : part.text
                  )
                });
                break;
              }
              case "tool-call": {
                bedrockContent.push({
                  toolUse: {
                    toolUseId: part.toolCallId,
                    name: part.toolName,
                    input: part.args
                  }
                });
                break;
              }
            }
          }
        }
        messages.push({ role: "assistant", content: bedrockContent });
        break;
      }
      default: {
        const _exhaustiveCheck = type;
        throw new Error(`Unsupported type: ${_exhaustiveCheck}`);
      }
    }
  }
  return {
    system,
    messages
  };
}
function groupIntoBlocks(prompt) {
  const blocks = [];
  let currentBlock = void 0;
  for (const message of prompt) {
    const { role } = message;
    switch (role) {
      case "system": {
        if ((currentBlock == null ? void 0 : currentBlock.type) !== "system") {
          currentBlock = { type: "system", messages: [] };
          blocks.push(currentBlock);
        }
        currentBlock.messages.push(message);
        break;
      }
      case "assistant": {
        if ((currentBlock == null ? void 0 : currentBlock.type) !== "assistant") {
          currentBlock = { type: "assistant", messages: [] };
          blocks.push(currentBlock);
        }
        currentBlock.messages.push(message);
        break;
      }
      case "user": {
        if ((currentBlock == null ? void 0 : currentBlock.type) !== "user") {
          currentBlock = { type: "user", messages: [] };
          blocks.push(currentBlock);
        }
        currentBlock.messages.push(message);
        break;
      }
      case "tool": {
        if ((currentBlock == null ? void 0 : currentBlock.type) !== "user") {
          currentBlock = { type: "user", messages: [] };
          blocks.push(currentBlock);
        }
        currentBlock.messages.push(message);
        break;
      }
      default: {
        const _exhaustiveCheck = role;
        throw new Error(`Unsupported role: ${_exhaustiveCheck}`);
      }
    }
  }
  return blocks;
}

// src/map-bedrock-finish-reason.ts
function mapBedrockFinishReason(finishReason) {
  switch (finishReason) {
    case "stop_sequence":
    case "end_turn":
      return "stop";
    case "max_tokens":
      return "length";
    case "content_filtered":
    case "guardrail_intervened":
      return "content-filter";
    case "tool_use":
      return "tool-calls";
    default:
      return "unknown";
  }
}

// src/bedrock-chat-language-model.ts
var BedrockChatLanguageModel = class {
  constructor(modelId, settings, config) {
    this.specificationVersion = "v1";
    this.provider = "amazon-bedrock";
    this.defaultObjectGenerationMode = "tool";
    this.supportsImageUrls = false;
    this.modelId = modelId;
    this.settings = settings;
    this.config = config;
  }
  getArgs({
    mode,
    prompt,
    maxTokens,
    temperature,
    topP,
    topK,
    frequencyPenalty,
    presencePenalty,
    stopSequences,
    responseFormat,
    seed,
    providerMetadata,
    headers
  }) {
    var _a, _b;
    const type = mode.type;
    const warnings = [];
    if (frequencyPenalty != null) {
      warnings.push({
        type: "unsupported-setting",
        setting: "frequencyPenalty"
      });
    }
    if (presencePenalty != null) {
      warnings.push({
        type: "unsupported-setting",
        setting: "presencePenalty"
      });
    }
    if (seed != null) {
      warnings.push({
        type: "unsupported-setting",
        setting: "seed"
      });
    }
    if (headers != null) {
      warnings.push({
        type: "unsupported-setting",
        setting: "headers"
      });
    }
    if (topK != null) {
      warnings.push({
        type: "unsupported-setting",
        setting: "topK"
      });
    }
    if (responseFormat != null && responseFormat.type !== "text") {
      warnings.push({
        type: "unsupported-setting",
        setting: "responseFormat",
        details: "JSON response format is not supported."
      });
    }
    const { system, messages } = convertToBedrockChatMessages(prompt);
    const baseArgs = {
      modelId: this.modelId,
      system: system ? [{ text: system }] : void 0,
      additionalModelRequestFields: this.settings.additionalModelRequestFields,
      inferenceConfig: {
        maxTokens,
        temperature,
        topP,
        stopSequences
      },
      messages,
      guardrailConfig: (_a = providerMetadata == null ? void 0 : providerMetadata.bedrock) == null ? void 0 : _a.guardrailConfig
    };
    switch (type) {
      case "regular": {
        const { toolConfig, toolWarnings } = prepareTools(mode);
        return {
          command: {
            ...baseArgs,
            ...((_b = toolConfig.tools) == null ? void 0 : _b.length) ? { toolConfig } : {}
          },
          warnings: [...warnings, ...toolWarnings]
        };
      }
      case "object-json": {
        throw new import_provider3.UnsupportedFunctionalityError({
          functionality: "json-mode object generation"
        });
      }
      case "object-tool": {
        return {
          command: {
            ...baseArgs,
            toolConfig: {
              tools: [
                {
                  toolSpec: {
                    name: mode.tool.name,
                    description: mode.tool.description,
                    inputSchema: {
                      json: mode.tool.parameters
                    }
                  }
                }
              ],
              toolChoice: { tool: { name: mode.tool.name } }
            }
          },
          warnings
        };
      }
      default: {
        const _exhaustiveCheck = type;
        throw new Error(`Unsupported type: ${_exhaustiveCheck}`);
      }
    }
  }
  async doGenerate(options) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l;
    const { command, warnings } = this.getArgs(options);
    const response = await this.config.client.send(
      new import_client_bedrock_runtime.ConverseCommand(command)
    );
    const { messages: rawPrompt, ...rawSettings } = command;
    const providerMetadata = response.trace ? { bedrock: { trace: response.trace } } : void 0;
    return {
      text: (_d = (_c = (_b = (_a = response.output) == null ? void 0 : _a.message) == null ? void 0 : _b.content) == null ? void 0 : _c.map((part) => {
        var _a2;
        return (_a2 = part.text) != null ? _a2 : "";
      }).join("")) != null ? _d : void 0,
      toolCalls: (_h = (_g = (_f = (_e = response.output) == null ? void 0 : _e.message) == null ? void 0 : _f.content) == null ? void 0 : _g.filter((part) => !!part.toolUse)) == null ? void 0 : _h.map((part) => {
        var _a2, _b2, _c2, _d2, _e2, _f2;
        return {
          toolCallType: "function",
          toolCallId: (_b2 = (_a2 = part.toolUse) == null ? void 0 : _a2.toolUseId) != null ? _b2 : this.config.generateId(),
          toolName: (_d2 = (_c2 = part.toolUse) == null ? void 0 : _c2.name) != null ? _d2 : `tool-${this.config.generateId()}`,
          args: JSON.stringify((_f2 = (_e2 = part.toolUse) == null ? void 0 : _e2.input) != null ? _f2 : "")
        };
      }),
      finishReason: mapBedrockFinishReason(response.stopReason),
      usage: {
        promptTokens: (_j = (_i = response.usage) == null ? void 0 : _i.inputTokens) != null ? _j : Number.NaN,
        completionTokens: (_l = (_k = response.usage) == null ? void 0 : _k.outputTokens) != null ? _l : Number.NaN
      },
      rawCall: { rawPrompt, rawSettings },
      warnings,
      providerMetadata
    };
  }
  async doStream(options) {
    const { command, warnings } = this.getArgs(options);
    const response = await this.config.client.send(
      new import_client_bedrock_runtime.ConverseStreamCommand(command)
    );
    const { messages: rawPrompt, ...rawSettings } = command;
    let finishReason = "unknown";
    let usage = {
      promptTokens: Number.NaN,
      completionTokens: Number.NaN
    };
    let providerMetadata = void 0;
    if (!response.stream) {
      throw new Error("No stream found");
    }
    const stream = new ReadableStream({
      async start(controller) {
        for await (const chunk of response.stream) {
          controller.enqueue({ success: true, value: chunk });
        }
        controller.close();
      }
    });
    const toolCallContentBlocks = {};
    return {
      stream: stream.pipeThrough(
        new TransformStream({
          transform(chunk, controller) {
            var _a, _b, _c, _d, _e, _f, _g, _h, _i;
            function enqueueError(error) {
              finishReason = "error";
              controller.enqueue({ type: "error", error });
            }
            if (!chunk.success) {
              enqueueError(chunk.error);
              return;
            }
            const value = chunk.value;
            if (value.internalServerException) {
              enqueueError(value.internalServerException);
              return;
            }
            if (value.modelStreamErrorException) {
              enqueueError(value.modelStreamErrorException);
              return;
            }
            if (value.throttlingException) {
              enqueueError(value.throttlingException);
              return;
            }
            if (value.validationException) {
              enqueueError(value.validationException);
              return;
            }
            if (value.messageStop) {
              finishReason = mapBedrockFinishReason(
                value.messageStop.stopReason
              );
            }
            if (value.metadata) {
              usage = {
                promptTokens: (_b = (_a = value.metadata.usage) == null ? void 0 : _a.inputTokens) != null ? _b : Number.NaN,
                completionTokens: (_d = (_c = value.metadata.usage) == null ? void 0 : _c.outputTokens) != null ? _d : Number.NaN
              };
              if (value.metadata.trace) {
                providerMetadata = {
                  bedrock: {
                    trace: value.metadata.trace
                  }
                };
              }
            }
            if ((_f = (_e = value.contentBlockDelta) == null ? void 0 : _e.delta) == null ? void 0 : _f.text) {
              controller.enqueue({
                type: "text-delta",
                textDelta: value.contentBlockDelta.delta.text
              });
            }
            const contentBlockStart = value.contentBlockStart;
            if (((_g = contentBlockStart == null ? void 0 : contentBlockStart.start) == null ? void 0 : _g.toolUse) != null) {
              const toolUse = contentBlockStart.start.toolUse;
              toolCallContentBlocks[contentBlockStart.contentBlockIndex] = {
                toolCallId: toolUse.toolUseId,
                toolName: toolUse.name,
                jsonText: ""
              };
            }
            const contentBlockDelta = value.contentBlockDelta;
            if ((_h = contentBlockDelta == null ? void 0 : contentBlockDelta.delta) == null ? void 0 : _h.toolUse) {
              const contentBlock = toolCallContentBlocks[contentBlockDelta.contentBlockIndex];
              const delta = (_i = contentBlockDelta.delta.toolUse.input) != null ? _i : "";
              controller.enqueue({
                type: "tool-call-delta",
                toolCallType: "function",
                toolCallId: contentBlock.toolCallId,
                toolName: contentBlock.toolName,
                argsTextDelta: delta
              });
              contentBlock.jsonText += delta;
            }
            const contentBlockStop = value.contentBlockStop;
            if (contentBlockStop != null) {
              const index = contentBlockStop.contentBlockIndex;
              const contentBlock = toolCallContentBlocks[index];
              if (contentBlock != null) {
                controller.enqueue({
                  type: "tool-call",
                  toolCallType: "function",
                  toolCallId: contentBlock.toolCallId,
                  toolName: contentBlock.toolName,
                  args: contentBlock.jsonText
                });
                delete toolCallContentBlocks[index];
              }
            }
          },
          flush(controller) {
            controller.enqueue({
              type: "finish",
              finishReason,
              usage,
              providerMetadata
            });
          }
        })
      ),
      rawCall: { rawPrompt, rawSettings },
      warnings
    };
  }
};

// src/bedrock-embedding-model.ts
var import_client_bedrock_runtime2 = require("@aws-sdk/client-bedrock-runtime");
var BedrockEmbeddingModel = class {
  constructor(modelId, settings, config) {
    this.specificationVersion = "v1";
    this.provider = "amazon-bedrock";
    this.maxEmbeddingsPerCall = void 0;
    this.supportsParallelCalls = true;
    this.modelId = modelId;
    this.config = config;
    this.settings = settings;
  }
  async doEmbed({
    values
  }) {
    const fn = async (inputText) => {
      const payload = {
        inputText,
        dimensions: this.settings.dimensions,
        normalize: this.settings.normalize
      };
      const command = new import_client_bedrock_runtime2.InvokeModelCommand({
        contentType: "application/json",
        body: JSON.stringify(payload),
        modelId: this.modelId
      });
      const rawResponse = await this.config.client.send(command);
      const parsed = JSON.parse(new TextDecoder().decode(rawResponse.body));
      return parsed;
    };
    const responses = await Promise.all(values.map(fn));
    const response = responses.reduce(
      (acc, r) => {
        acc.embeddings.push(r.embedding);
        acc.usage.tokens += r.inputTextTokenCount;
        return acc;
      },
      { embeddings: [], usage: { tokens: 0 } }
    );
    return response;
  }
};

// src/bedrock-provider.ts
function createAmazonBedrock(options = {}) {
  const createBedrockRuntimeClient = () => {
    var _a;
    return new import_client_bedrock_runtime3.BedrockRuntimeClient(
      (_a = options.bedrockOptions) != null ? _a : {
        region: (0, import_provider_utils2.loadSetting)({
          settingValue: options.region,
          settingName: "region",
          environmentVariableName: "AWS_REGION",
          description: "AWS region"
        }),
        credentials: {
          accessKeyId: (0, import_provider_utils2.loadSetting)({
            settingValue: options.accessKeyId,
            settingName: "accessKeyId",
            environmentVariableName: "AWS_ACCESS_KEY_ID",
            description: "AWS access key ID"
          }),
          secretAccessKey: (0, import_provider_utils2.loadSetting)({
            settingValue: options.secretAccessKey,
            settingName: "secretAccessKey",
            environmentVariableName: "AWS_SECRET_ACCESS_KEY",
            description: "AWS secret access key"
          }),
          sessionToken: (0, import_provider_utils2.loadOptionalSetting)({
            settingValue: options.sessionToken,
            environmentVariableName: "AWS_SESSION_TOKEN"
          })
        }
      }
    );
  };
  const createChatModel = (modelId, settings = {}) => new BedrockChatLanguageModel(modelId, settings, {
    client: createBedrockRuntimeClient(),
    generateId: import_provider_utils2.generateId
  });
  const provider = function(modelId, settings) {
    if (new.target) {
      throw new Error(
        "The Amazon Bedrock model function cannot be called with the new keyword."
      );
    }
    return createChatModel(modelId, settings);
  };
  const createEmbeddingModel = (modelId, settings = {}) => new BedrockEmbeddingModel(modelId, settings, {
    client: createBedrockRuntimeClient()
  });
  provider.languageModel = createChatModel;
  provider.embedding = createEmbeddingModel;
  provider.textEmbedding = createEmbeddingModel;
  provider.textEmbeddingModel = createEmbeddingModel;
  return provider;
}
var bedrock = createAmazonBedrock();
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  bedrock,
  createAmazonBedrock
});
//# sourceMappingURL=index.js.map