import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LineTokenLoginDto {
  @ApiProperty({ description: 'LINE access token from LIFF SDK' })
  @IsString()
  @IsNotEmpty()
  accessToken: string;
}
