import {
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Request,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { routesV1 } from '@config/app.routes';
import { LogoutCommand } from './logout.command';
import { JwtPayload } from '@src/infrastructure/auth/jwt.strategy';

@Controller(routesV1.version)
export class LogoutHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @ApiOperation({ summary: 'Logout (revoke all refresh tokens)' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post(routesV1.auth.logout)
  async logout(@Request() req: { user: JwtPayload }): Promise<void> {
    const command = new LogoutCommand({ userId: req.user.sub });
    await this.commandBus.execute(command);
  }
}
