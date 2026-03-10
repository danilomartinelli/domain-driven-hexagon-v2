import {
  CallHandler,
  ExecutionContext,
  HttpStatus,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { createHash } from "crypto";
import { Observable, of } from "rxjs";
import { map } from "rxjs/operators";

const DEFAULT_CACHE_CONTROL = "private, max-age=60";

@Injectable()
export class HttpCacheInterceptor implements NestInterceptor {
  constructor(private readonly cacheControl: string = DEFAULT_CACHE_CONTROL) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();

    if (!request || request.method?.toUpperCase() !== "GET") {
      return next.handle();
    }

    const response = context.switchToHttp().getResponse();
    const ifNoneMatch = request.headers?.["if-none-match"];

    return next.handle().pipe(
      map((body) => {
        const etag = this.computeETag(body);

        response.setHeader("ETag", etag);
        response.setHeader("Cache-Control", this.cacheControl);

        if (ifNoneMatch && ifNoneMatch === etag) {
          response.status(HttpStatus.NOT_MODIFIED);
          return undefined;
        }

        return body;
      }),
    );
  }

  private computeETag(body: any): string {
    const hash = createHash("md5").update(JSON.stringify(body)).digest("hex");
    return `"${hash}"`;
  }
}
