import { IsString, IsOptional, IsEnum, MinLength } from 'class-validator';

export enum BlogType {
  BLOG = 'BLOG',
  VLOG = 'VLOG',
}

export class CreateBlogDto {
  @IsString()
  @MinLength(3)
  title: string;

  @IsString()
  @MinLength(10)
  content: string;

  @IsString()
  @IsOptional()
  mediaUrl?: string;

  @IsEnum(BlogType)
  @IsOptional()
  type?: BlogType;
}
