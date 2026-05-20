import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ManagerDecisionDto {
  @IsString()
  @IsNotEmpty()
  managerId: string;

  @IsString()
  @IsOptional()
  comment?: string;
}
