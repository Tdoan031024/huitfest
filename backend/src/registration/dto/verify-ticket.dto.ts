import { IsOptional, IsString, MaxLength } from 'class-validator';

export class VerifyTicketDto {
  @IsOptional()
  @IsString()
  @MaxLength(1200)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  token?: string;
}
