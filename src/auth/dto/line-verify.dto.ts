import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LineVerifyDto {
  @ApiProperty({ description: 'LINE access token to verify' })
  @IsString()
  @IsNotEmpty()
  accessToken: string;
}
