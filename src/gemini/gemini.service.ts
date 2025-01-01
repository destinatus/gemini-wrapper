import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { ChatCompletionRequest, CompletionRequest, EmbeddingRequest } from './dto/openai.dto';

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
    text?: string;
  }>;
}

interface GeminiEmbeddingResponse {
  embedding: {
    values: number[];
  };
}

interface GeminiBatchEmbeddingResponse {
  embeddings: Array<{
    values: number[];
  }>;
}

@Injectable()
export class GeminiService {
  private readonly apiEndpoint = 'https://generativelanguage.googleapis.com/v1/models';
  private readonly defaultModel: string = 'gemini-pro';

  constructor(private configService: ConfigService) {}

  async listModels() {
    return {
      object: 'list',
      data: [
        {
          id: 'gemini-pro',
          object: 'model',
          created: Date.now(),
          owned_by: 'google',
        },
        {
          id: 'gemini-pro-vision',
          object: 'model',
          created: Date.now(),
          owned_by: 'google',
        }
      ]
    };
  }

  async createChatCompletion(request: ChatCompletionRequest) {
    try {
      const apiKey = this.configService.get<string>('gemini.apiKey');
      if (!apiKey) {
        throw new HttpException('Gemini API key not configured', HttpStatus.INTERNAL_SERVER_ERROR);
      }

      // Convert OpenAI messages to Gemini format
      const contents = request.messages.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : msg.role,
        parts: [{ text: msg.content }]
      }));

      const apiResponse = await axios.post<GeminiResponse>(
        `${this.apiEndpoint}/${this.defaultModel}:generateContent?key=${apiKey}`,
        {
          contents,
          generationConfig: {
            temperature: request.temperature ?? 0.7,
            maxOutputTokens: request.max_tokens ?? 1024,
            topP: 0.8,
            topK: 40
          }
        }
      );

      const generatedText = apiResponse.data.candidates?.[0]?.content?.parts?.[0]?.text || 
                           apiResponse.data.candidates?.[0]?.text ||
                           'No response generated';

      const timestamp = Date.now();
      return {
        id: `chatcmpl-${timestamp}`,
        object: 'chat.completion',
        created: timestamp,
        model: request.model || this.defaultModel,
        system_fingerprint: `fp_${timestamp}`,
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: generatedText
            },
            finish_reason: 'stop'
          }
        ],
        usage: {
          prompt_tokens: Math.ceil(request.messages.reduce((acc, msg) => acc + msg.content.length, 0) / 4),
          completion_tokens: Math.ceil(generatedText.length / 4),
          total_tokens: Math.ceil((request.messages.reduce((acc, msg) => acc + msg.content.length, 0) + generatedText.length) / 4)
        }
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  async createCompletion(request: CompletionRequest) {
    try {
      const apiKey = this.configService.get<string>('gemini.apiKey');
      if (!apiKey) {
        throw new HttpException('Gemini API key not configured', HttpStatus.INTERNAL_SERVER_ERROR);
      }

      const apiResponse = await axios.post<GeminiResponse>(
        `${this.apiEndpoint}/${this.defaultModel}:generateContent?key=${apiKey}`,
        {
          contents: [{
            parts: [{
              text: request.prompt
            }]
          }],
          generationConfig: {
            temperature: request.temperature ?? 0.7,
            maxOutputTokens: request.max_tokens ?? 1024,
            topP: 0.8,
            topK: 40
          }
        }
      );

      const generatedText = apiResponse.data.candidates?.[0]?.content?.parts?.[0]?.text || 
                           apiResponse.data.candidates?.[0]?.text ||
                           'No response generated';

      return {
        id: `cmpl-${Date.now()}`,
        object: 'text_completion',
        created: Date.now(),
        model: request.model || this.defaultModel,
        choices: [
          {
            text: generatedText,
            index: 0,
            logprobs: null,
            finish_reason: 'stop'
          }
        ],
        usage: {
          prompt_tokens: Math.ceil(request.prompt.length / 4),
          completion_tokens: Math.ceil(generatedText.length / 4),
          total_tokens: Math.ceil((request.prompt.length + generatedText.length) / 4)
        }
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  async createEmbedding(request: EmbeddingRequest) {
    try {
      const apiKey = this.configService.get<string>('gemini.apiKey');
      if (!apiKey) {
        throw new HttpException('Gemini API key not configured', HttpStatus.INTERNAL_SERVER_ERROR);
      }

      const inputs = Array.isArray(request.input) ? request.input : [request.input];
      
      // Use batch endpoint if multiple inputs, otherwise use single embedding endpoint
      const endpoint = inputs.length > 1 
        ? `${this.apiEndpoint}/text-embedding-004:batchEmbedContents`
        : `${this.apiEndpoint}/text-embedding-004:embedContent`;

      const apiResponse = await axios.post<GeminiEmbeddingResponse | GeminiBatchEmbeddingResponse>(
        `${endpoint}?key=${apiKey}`,
        inputs.length > 1
          ? {
              requests: inputs.map(text => ({
                content: { parts: [{ text }] }
              }))
            }
          : {
              content: { parts: [{ text: inputs[0] }] }
            }
      );

      // Transform response to match OpenAI format
      const embeddings = inputs.length > 1
        ? (apiResponse.data as GeminiBatchEmbeddingResponse).embeddings
        : [(apiResponse.data as GeminiEmbeddingResponse).embedding];

      return {
        object: 'list',
        data: embeddings.map((embedding, i) => ({
          object: 'embedding',
          embedding: embedding.values,
          index: i
        })),
        model: 'text-embedding-004',
        usage: {
          prompt_tokens: Math.ceil(inputs.reduce((acc, text) => acc + text.length, 0) / 4),
          total_tokens: Math.ceil(inputs.reduce((acc, text) => acc + text.length, 0) / 4)
        }
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  private handleError(error: unknown) {
    // Check if it's an Axios error
    if (error && typeof error === 'object' && 'isAxiosError' in error) {
      const axiosError = error as any;
      const status = axiosError.response?.status || HttpStatus.INTERNAL_SERVER_ERROR;
      const message = axiosError.response?.data?.error?.message || axiosError.message || 'Unknown error occurred';
      throw new HttpException(
        {
          error: {
            message: `Gemini API error: ${message}`,
            type: 'gemini_error',
            code: status
          }
        },
        status
      );
    }
    
    // Handle non-Axios errors
    throw new HttpException(
      {
        error: {
          message: error instanceof Error ? error.message : 'An unexpected error occurred',
          type: 'internal_error',
          code: HttpStatus.INTERNAL_SERVER_ERROR
        }
      },
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
}
