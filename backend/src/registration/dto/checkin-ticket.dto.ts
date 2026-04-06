import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CheckinTicketDto {
  @IsOptional()
  @IsString()
  @MaxLength(1200)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  token?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  checkedInBy?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  gateId?: string;
}
