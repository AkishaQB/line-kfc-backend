import {
  Controller,
  Post,
  Req,
  Res,
  HttpStatus,
  Logger,
  RawBodyRequest,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiExcludeEndpoint } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import * as crypto from 'crypto';
import { LineService } from './line.service';

@ApiTags('line')
@Controller('line')
export class LineController {
  private readonly logger = new Logger(LineController.name);

  constructor(
    private readonly lineService: LineService,
    private readonly configService: ConfigService,
  ) {}

  @Post('webhook')
  @ApiExcludeEndpoint() // Exclude from Swagger — webhook endpoint
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Res() res: Response,
  ) {
    const channelSecret = this.configService.get<string>('LINE_CHANNEL_SECRET');

    // Verify LINE signature
    if (channelSecret) {
      const signature = req.headers['x-line-signature'] as string;
      const body = req.rawBody;

      if (!signature || !body) {
        this.logger.warn('Missing signature or body in webhook request');
        return res.status(HttpStatus.BAD_REQUEST).json({ error: 'Missing signature' });
      }

      const expectedSignature = crypto
        .createHmac('SHA256', channelSecret)
        .update(body)
        .digest('base64');

      if (signature !== expectedSignature) {
        this.logger.warn('Invalid LINE webhook signature');
        return res.status(HttpStatus.UNAUTHORIZED).json({ error: 'Invalid signature' });
      }
    }

    const { events } = req.body;

    if (events && events.length > 0) {
      // Process events asynchronously
      this.lineService.handleWebhook(events).catch((error) => {
        this.logger.error(`Webhook processing error: ${error.message}`);
      });
    }

    // Always return 200 immediately to LINE
    return res.status(HttpStatus.OK).json({ status: 'ok' });
  }
}
