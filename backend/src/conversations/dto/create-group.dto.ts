import { IsString, IsNotEmpty, IsArray, IsOptional } from 'class-validator';

export class CreateGroupDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsArray()
  @IsString({ each: true })
  participantIds: string[];

  @IsString()
  @IsOptional()
  avatar?: string;
}
