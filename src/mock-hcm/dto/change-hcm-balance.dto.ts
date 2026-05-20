import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class ChangeHcmBalanceDto {
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
  @Min(0)
  availableBalance: number;
}
