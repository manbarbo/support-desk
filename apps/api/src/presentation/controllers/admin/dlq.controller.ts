import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  NotFoundException,
} from '@nestjs/common';

import { DLQManagementService } from '@application/services/dlq-management.service';

@Controller('admin/dlq')
export class DLQController {
  constructor(private readonly dlqService: DLQManagementService) {}

  @Get()
  async listMessages(@Query('limit') limit?: string) {
    const parsedLimit = this.parseLimit(limit);

    return this.dlqService.listMessages(parsedLimit);
  }

  @Get(':messageId')
  async getMessage(@Param('messageId') messageId: string) {
    const message = await this.dlqService.getMessage(messageId);

    if (!message) {
      throw new NotFoundException(`Message ${messageId} not found in DLQ`);
    }

    return message;
  }

  @Post(':messageId/reprocess')
  async reprocessMessage(@Param('messageId') messageId: string) {
    const success = await this.dlqService.reprocessMessage(messageId);

    if (!success) {
      throw new NotFoundException(`Message ${messageId} not found in DLQ`);
    }

    return {
      success: true,
      message: `Message ${messageId} reprocessed successfully`,
    };
  }

  @Post('reprocess-all')
  async reprocessAll(@Query('limit') limit?: string) {
    const parsedLimit = this.parseLimit(limit);

    const result = await this.dlqService.reprocessAll(parsedLimit);

    return {
      success: true,
      ...result,
    };
  }

  @Delete(':messageId')
  async deleteMessage(@Param('messageId') messageId: string) {
    const success = await this.dlqService.deleteMessage(messageId);

    if (!success) {
      throw new NotFoundException(`Message ${messageId} not found in DLQ`);
    }

    return {
      success: true,
      message: `Message ${messageId} deleted successfully`,
    };
  }

  private parseLimit(limit?: string): number | undefined {
    if (!limit) {
      return undefined;
    }

    const parsed = Number.parseInt(limit, 10);

    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  }
}
