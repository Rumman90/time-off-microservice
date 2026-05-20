import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class DeductLeaveDto {
  @IsString()
  @IsNotEmpty()
  requestId: string;

  @IsString()
  @IsNotEmpty()
  employeeId: string;

  @IsString()
  @IsNotEmpty()
  locationId: string;

  @IsString()
  @IsNotEmpty()
  leaveType: string;

  @IsNumber()
  @Min(0.5)
  days: number;

  @IsString()
  @IsNotEmpty()
  idempotencyKey: string;
}
