import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsArray, IsNumber, IsOptional, ValidateNested, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class Message {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  role: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  content: string;
}

export class ChatCompletionRequest {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  model: string;

  @ApiProperty({ type: [Message] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Message)
  messages: Message[];

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  temperature?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  max_tokens?: number;
}

export class CompletionRequest {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  model: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  prompt: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  temperature?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  max_tokens?: number;
}

export class EmbeddingRequest {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  model: string;

  @ApiProperty({ oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }] })
  @IsString({ each: true })
  @IsNotEmpty()
  input: string | string[];
}

export class ModelList {
  @ApiProperty()
  object: string;

  @ApiProperty({ type: [Object] })
  data: Array<{
    id: string;
    object: string;
    created: number;
    owned_by: string;
  }>;
}
