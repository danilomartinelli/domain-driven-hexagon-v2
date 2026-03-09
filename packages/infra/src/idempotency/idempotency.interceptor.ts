import {
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
  Logger,
  NestInterceptor,
} from "@nestjs/common";
import { Observable, of } from "rxjs";
import { catchError, tap } from "rxjs/operators";
import { IdempotencyRepository } from "./idempotency.repository";
import { IdempotencyOptions } from "./idempotency.types";

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  private readonly logger = new Logger(IdempotencyInterceptor.name);
  private readonly ttlMs: number;

  constructor(
    private readonly repository: IdempotencyRepository,
    @Inject("IDEMPOTENCY_OPTIONS")
    options: IdempotencyOptions,
  ) {
    this.ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
  }

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();

    if (!request) {
      return next.handle();
    }

    const method = request.method?.toUpperCase();

    if (method !== "POST" && method !== "PUT") {
      return next.handle();
    }

    const idempotencyKey = request.headers?.["idempotency-key"];

    if (!idempotencyKey) {
      return next.handle();
    }

    const cached = await this.repository.findByKey(idempotencyKey);

    if (cached) {
      this.logger.debug(
        `Returning cached response for idempotency key: ${idempotencyKey}`,
      );
      return of(cached.responseBody);
    }

    return next.handle().pipe(
      tap(async (responseBody) => {
        try {
          const response = context.switchToHttp().getResponse();
          const statusCode = response?.statusCode ?? 200;
          const now = new Date();

          await this.repository.save({
            key: idempotencyKey,
            responseStatus: statusCode,
            responseBody: responseBody ?? null,
            createdAt: now,
            expiresAt: new Date(now.getTime() + this.ttlMs),
          });
        } catch (error) {
          this.logger.warn(
            `Failed to cache idempotency key ${idempotencyKey}: ${error}`,
          );
        }
      }),
      catchError((error) => {
        throw error;
      }),
    );
  }
}
