import {
  Body,
  Controller,
  HttpStatus,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Result } from 'neverthrow';
import { ApiErrorResponse } from '@repo/core';
import { routesV1 } from '@config/app.routes';
import { RefreshTokenCommand } from './refresh-token.command';
import { RefreshTokenRequestDto } from './refresh-token.request.dto';
import { AuthTokensResponseDto } from '../../dtos/auth-tokens.response.dto';
import { TokenInvalidError } from '../../domain/auth.errors';
import { AuthTokens } from '../register/register.service';
import { Public } from '@src/infrastructure/auth/public.decorator';

@Controller(routesV1.version)
export class RefreshTokenHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Public()
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: HttpStatus.OK, type: AuthTokensResponseDto })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: TokenInvalidError.message,
    type: ApiErrorResponse,
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, type: ApiErrorResponse })
  @Post(routesV1.auth.refresh)
  async refresh(
    @Body() body: RefreshTokenRequestDto,
  ): Promise<AuthTokensResponseDto> {
    const command = new RefreshTokenCommand(body);
    const result: Result<AuthTokens, TokenInvalidError> =
      await this.commandBus.execute(command);

    return result.match(
      (tokens) => ({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
      }),
      (error) => {
        throw new UnauthorizedException(error.message);
      },
    );
  }
}
