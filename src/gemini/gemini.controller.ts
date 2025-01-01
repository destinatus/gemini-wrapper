import { Controller, Post, Body, Get, Res, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { GeminiService } from './gemini.service';
import { ChatCompletionRequest, CompletionRequest, EmbeddingRequest } from './dto/openai.dto';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('OpenAI Compatible API')
@Controller()
export class GeminiController {
  constructor(private readonly geminiService: GeminiService) {}

  @Get('v1/models')
  @ApiOperation({ summary: 'List available models' })
  @ApiResponse({ status: 200, description: 'Returns the list of available models' })
  async listModels(@Res() res: Response) {
    const result = await this.geminiService.listModels();
    res.status(HttpStatus.OK).json(result);
  }

  @Post('v1/chat/completions')
  @ApiOperation({ summary: 'Create a chat completion' })
  @ApiResponse({ status: 201, description: 'Returns the chat completion response' })
  async createChatCompletion(
    @Body() request: ChatCompletionRequest,
    @Res() res: Response,
  ) {
    const result = await this.geminiService.createChatCompletion(request);
    res.setHeader('Content-Type', 'application/json');
    const formattedResult = JSON.stringify(result, null, 2);
    res.status(HttpStatus.CREATED).send(formattedResult);
  }

  @Post('v1/completions')
  @ApiOperation({ summary: 'Create a completion' })
  @ApiResponse({ status: 201, description: 'Returns the completion response' })
  async createCompletion(
    @Body() request: CompletionRequest,
    @Res() res: Response,
  ) {
    const result = await this.geminiService.createCompletion(request);
    res.status(HttpStatus.CREATED).json(result);
  }

  @Post('v1/embeddings')
  @ApiOperation({ summary: 'Create embeddings' })
  @ApiResponse({ status: 201, description: 'Returns the embedding vectors' })
  async createEmbedding(
    @Body() request: EmbeddingRequest,
    @Res() res: Response,
  ) {
    const result = await this.geminiService.createEmbedding(request);
    res.status(HttpStatus.CREATED).json(result);
  }
}
