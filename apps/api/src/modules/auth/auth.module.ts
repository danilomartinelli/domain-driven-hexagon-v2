/**
 * AUTH MODULE — Cross-Module Import Exemption
 *
 * This module imports directly from the User module (UserRepositoryPort,
 * USER_REPOSITORY, UserModule). This is an accepted deviation from the
 * "modules communicate only via domain events" rule because auth
 * inherently orchestrates user creation (register) and credential
 * validation (login). Routing these through domain events would add
 * unnecessary indirection without improving decoupling.
 *
 * The exemption is enforced in .dependency-cruiser.js via the
 * `no-cross-module-imports-except-events` rule, which excludes
 * `src/modules/auth/` from the cross-module import restriction.
 */
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { RegisterHttpController } from './commands/register/register.http.controller';
import { LoginHttpController } from './commands/login/login.http.controller';
import { RefreshTokenHttpController } from './commands/refresh-token/refresh-token.http.controller';
import { LogoutHttpController } from './commands/logout/logout.http.controller';
import { RegisterService } from './commands/register/register.service';
import { LoginService } from './commands/login/login.service';
import { RefreshTokenService } from './commands/refresh-token/refresh-token.service';
import { LogoutService } from './commands/logout/logout.service';
import { RefreshTokenRepository } from './database/refresh-token.repository';
import { REFRESH_TOKEN_REPOSITORY } from './auth.di-tokens';
import { AuthModule } from '@src/infrastructure/auth/auth.module';
import { UserModule } from '@modules/user/user.module';

const httpControllers = [
  RegisterHttpController,
  LoginHttpController,
  RefreshTokenHttpController,
  LogoutHttpController,
];

const commandHandlers = [
  RegisterService,
  LoginService,
  RefreshTokenService,
  LogoutService,
];

const repositories = [
  { provide: REFRESH_TOKEN_REPOSITORY, useClass: RefreshTokenRepository },
];

@Module({
  imports: [CqrsModule, AuthModule, UserModule],
  controllers: [...httpControllers],
  providers: [...commandHandlers, ...repositories],
})
export class AuthDomainModule {}
