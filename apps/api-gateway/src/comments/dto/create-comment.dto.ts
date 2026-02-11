import { IsString, IsOptional, MinLength } from 'class-validator';

export class CreateCommentDto {
  @IsString()
  @MinLength(1)
  content: string;

  @IsString()
  @IsOptional()
  parentCommentId?: string;
}
