import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LineLoginDto {
  @ApiProperty({ description: 'LINE authorization code from OAuth2 flow' })
  @IsString()
  @IsNotEmpty()
  code: string;
}
