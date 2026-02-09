import { IsString, IsOptional, MaxLength } from 'class-validator';

export class CreateProfileDto {
  @IsString()
  @MaxLength(50)
  username: string;

  @IsString()
  @IsOptional()
  bio?: string;

  @IsString()
  @IsOptional()
  avatarUrl?: string;
}
