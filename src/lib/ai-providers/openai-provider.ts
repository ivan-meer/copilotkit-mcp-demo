/**
 * OpenAI Provider Implementation
 * 
 * Concrete implementation of the Universal AI Provider interface for OpenAI.
 * Supports both OpenAI and Azure OpenAI endpoints with streaming capabilities.
 * 
 * @author Claude Code
 * @version 1.0.0
 * @since 2025-01-24
 */

import OpenAI from 'openai';
import {
  AIProvider,
  ProviderConfig,
  CompletionRequest,
  CompletionResponse,
  StreamChunk,
  UniversalMessage,
  MessageRole,
  ToolCall,
} from './types';
import { BaseAIProvider } from './base-provider';

/**
 * OpenAI Provider Implementation
 * 
 * Features:
 * - Full OpenAI API compatibility
 * - Azure OpenAI support
 * - Function calling with tools
 * - Streaming responses
 * - Automatic token counting
 * - Error handling and retries
 */
export class OpenAIProvider extends BaseAIProvider {
  private client: OpenAI | null = null;
  private isAzure: boolean = false;
  
  constructor() {
    super(AIProvider.OPENAI);
  }
  
  /**
   * Initialize OpenAI client
   */
  protected async initializeProvider(config: ProviderConfig): Promise<void> {
    this.isAzure = config.provider === AIProvider.AZURE;
    
    if (this.isAzure) {
      // Azure OpenAI configuration
      this.client = new OpenAI({
        apiKey: config.apiKey,
        baseURL: config.endpoint,
        defaultQuery: { 'api-version': '2023-12-01-preview' },
        defaultHeaders: {
          'api-key': config.apiKey,
        },
        timeout: config.timeout || 60000,
        maxRetries: 0, // We handle retries in base class
      });
    } else {
      // Standard OpenAI configuration
      this.client = new OpenAI({
        apiKey: config.apiKey,
        baseURL: config.endpoint,
        timeout: config.timeout || 60000,
        maxRetries: 0, // We handle retries in base class
      });
    }
    
    console.log(`🔧 OpenAI client initialized for ${this.isAzure ? 'Azure' : 'OpenAI'}`);
  }
  
  /**
   * Test connection to OpenAI
   */
  protected async testConnection(): Promise<void> {
    if (!this.client) {
      throw new Error('OpenAI client not initialized');
    }
    
    try {
      // Simple test request
      const response = await this.client.chat.completions.create({
        model: this.config.model,
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 1,
        temperature: 0,
      });
      
      if (!response.choices?.[0]?.message) {
        throw new Error('Invalid response from OpenAI');
      }
      
      console.log(`✅ OpenAI connection test successful`);
    } catch (error) {
      console.error(`❌ OpenAI connection test failed:`, error);
      throw error;
    }
  }
  
  /**
   * Perform completion request
   */
  protected async performCompletion(request: CompletionRequest): Promise<CompletionResponse> {
    if (!this.client) {
      throw new Error('OpenAI client not initialized');
    }
    
    const messages = this.convertMessages(request.messages);
    const tools = this.convertTools(request.tools);
    
    const response = await this.withRetry(async () => {
      return this.client!.chat.completions.create({
        model: this.config.model,
        messages,
        tools: tools.length > 0 ? tools : undefined,
        tool_choice: this.convertToolChoice(request.toolChoice),
        max_tokens: request.maxTokens || this.config.maxTokens,
        temperature: request.temperature ?? this.config.temperature ?? 0.7,
        top_p: this.config.topP,
        frequency_penalty: this.config.frequencyPenalty,
        presence_penalty: this.config.presencePenalty,
        stop: request.stopSequences,
        stream: false,
      });
    });
    
    return this.convertResponse(response);
  }
  
  /**
   * Perform streaming completion request
   */
  protected async* performStreamCompletion(request: CompletionRequest): AsyncIterableIterator<StreamChunk> {
    if (!this.client) {
      throw new Error('OpenAI client not initialized');
    }
    
    const messages = this.convertMessages(request.messages);
    const tools = this.convertTools(request.tools);
    
    const stream = await this.withRetry(async () => {
      return this.client!.chat.completions.create({
        model: this.config.model,
        messages,
        tools: tools.length > 0 ? tools : undefined,
        tool_choice: this.convertToolChoice(request.toolChoice),
        max_tokens: request.maxTokens || this.config.maxTokens,
        temperature: request.temperature ?? this.config.temperature ?? 0.7,
        top_p: this.config.topP,
        frequency_penalty: this.config.frequencyPenalty,
        presence_penalty: this.config.presencePenalty,
        stop: request.stopSequences,
        stream: true,
      });
    });
    
    let accumulatedContent = '';
    let accumulatedToolCalls: Record<string, Partial<ToolCall>> = {};
    
    for await (const chunk of stream) {
      const choice = chunk.choices[0];
      if (!choice) continue;
      
      const { delta, finish_reason } = choice;
      
      // Handle content
      if (delta.content) {
        accumulatedContent += delta.content;
        yield {
          id: chunk.id,
          content: accumulatedContent,
          delta: delta.content,
          finished: false,
        };
      }
      
      // Handle tool calls
      if (delta.tool_calls) {
        for (const toolCall of delta.tool_calls) {
          const id = toolCall.id || `tool_${toolCall.index}`;
          
          if (!accumulatedToolCalls[id]) {
            accumulatedToolCalls[id] = {
              id,
              name: '',
              parameters: {},
              status: 'pending',
            };
          }
          
          const accumulated = accumulatedToolCalls[id];
          
          if (toolCall.function?.name) {
            accumulated.name = toolCall.function.name;
          }
          
          if (toolCall.function?.arguments) {
            try {
              const args = JSON.parse(toolCall.function.arguments);
              accumulated.parameters = { ...accumulated.parameters, ...args };
            } catch (error) {
              // Arguments might be streamed, so partial JSON is expected
              // FIXME: Implement proper streaming JSON parser
            }
          }
        }
        
        yield {
          id: chunk.id,
          toolCalls: Object.values(accumulatedToolCalls) as ToolCall[],
          finished: false,
        };
      }
      
      // Handle finish
      if (finish_reason) {
        yield {
          id: chunk.id,
          content: accumulatedContent,
          toolCalls: Object.values(accumulatedToolCalls) as ToolCall[],
          finished: true,
          finishReason: this.convertFinishReason(finish_reason),
        };
        break;
      }
    }
  }
  
  /**
   * Get available models
   */
  async getAvailableModels(): Promise<string[]> {
    if (!this.client) {
      throw new Error('OpenAI client not initialized');
    }
    
    try {
      const response = await this.client.models.list();
      return response.data
        .filter(model => model.id.includes('gpt')) // Only chat models
        .map(model => model.id)
        .sort();
    } catch (error) {
      console.error('Failed to fetch OpenAI models:', error);
      // Return default models if API call fails
      return [
        'gpt-4o',
        'gpt-4o-mini',
        'gpt-4-turbo',
        'gpt-4',
        'gpt-3.5-turbo',
      ];
    }
  }
  
  /**
   * Convert universal messages to OpenAI format
   */
  private convertMessages(messages: UniversalMessage[]): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
    return messages.map(msg => {
      switch (msg.role) {
        case MessageRole.SYSTEM:
          return { role: 'system', content: msg.content };
        case MessageRole.USER:
          return { role: 'user', content: msg.content };
        case MessageRole.ASSISTANT:
          const assistantMessage: OpenAI.Chat.Completions.ChatCompletionAssistantMessageParam = {
            role: 'assistant',
            content: msg.content,
          };
          
          if (msg.toolCalls && msg.toolCalls.length > 0) {
            assistantMessage.tool_calls = msg.toolCalls.map(tc => ({
              id: tc.id,
              type: 'function',
              function: {
                name: tc.name,
                arguments: JSON.stringify(tc.parameters),
              },
            }));
          }
          
          return assistantMessage;
        case MessageRole.TOOL:
          return {
            role: 'tool',
            content: msg.content,
            tool_call_id: msg.toolCallId!,
          };
        default:
          throw new Error(`Unsupported message role: ${msg.role}`);
      }
    });
  }
  
  /**
   * Convert universal tools to OpenAI format
   */
  private convertTools(tools?: any[]): OpenAI.Chat.Completions.ChatCompletionTool[] {
    if (!tools) return [];
    
    return tools.map(tool => ({
      type: 'function',
      function: {
        name: tool.function.name,
        description: tool.function.description,
        parameters: tool.function.parameters,
      },
    }));
  }
  
  /**
   * Convert tool choice to OpenAI format
   */
  private convertToolChoice(toolChoice?: any): OpenAI.Chat.Completions.ChatCompletionToolChoiceOption | undefined {
    if (!toolChoice) return undefined;
    
    if (typeof toolChoice === 'string') {
      switch (toolChoice) {
        case 'auto': return 'auto';
        case 'required': return 'required';
        case 'none': return 'none';
        default: return undefined;
      }
    }
    
    if (typeof toolChoice === 'object' && toolChoice.type === 'function') {
      return {
        type: 'function',
        function: { name: toolChoice.function.name },
      };
    }
    
    return undefined;
  }
  
  /**
   * Convert OpenAI response to universal format
   */
  private convertResponse(response: OpenAI.Chat.Completions.ChatCompletion): CompletionResponse {
    const choice = response.choices[0];
    const message = choice.message;
    
    const universalMessage: UniversalMessage = {
      id: response.id,
      role: MessageRole.ASSISTANT,
      content: message.content || '',
      timestamp: new Date(),
      metadata: {
        model: response.model,
        openai_id: response.id,
      },
    };
    
    // Convert tool calls
    if (message.tool_calls) {
      universalMessage.toolCalls = message.tool_calls.map(tc => ({
        id: tc.id,
        name: tc.function.name,
        parameters: JSON.parse(tc.function.arguments),
        status: 'pending' as const,
      }));
    }
    
    return {
      id: response.id,
      message: universalMessage,
      usage: response.usage ? {
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens,
      } : undefined,
      finishReason: this.convertFinishReason(choice.finish_reason),
      metadata: {
        model: response.model,
        created: response.created,
      },
    };
  }
  
  /**
   * Convert OpenAI finish reason to universal format
   */
  private convertFinishReason(reason: string | null): 'stop' | 'length' | 'tool_calls' | 'content_filter' {
    switch (reason) {
      case 'stop': return 'stop';
      case 'length': return 'length';
      case 'tool_calls': return 'tool_calls';
      case 'content_filter': return 'content_filter';
      default: return 'stop';
    }
  }
  
  /**
   * Clean up resources
   */
  async dispose(): Promise<void> {
    await super.dispose();
    this.client = null;
  }
}

// TODO: Add support for vision models (gpt-4-vision-preview)
// TODO: Implement proper streaming JSON parser for tool calls
// FIXME: Handle Azure OpenAI API versioning more elegantly
// TODO: Add support for OpenAI function calling (legacy)