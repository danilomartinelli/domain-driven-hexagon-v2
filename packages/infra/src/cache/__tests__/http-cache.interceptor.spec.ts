import { HttpCacheInterceptor } from "../http-cache.interceptor";
import { CallHandler, ExecutionContext, HttpStatus } from "@nestjs/common";
import { of, lastValueFrom } from "rxjs";
import { createHash } from "crypto";

function computeExpectedETag(body: any): string {
  const hash = createHash("md5").update(JSON.stringify(body)).digest("hex");
  return `"${hash}"`;
}

function createMockExecutionContext(overrides?: {
  method?: string;
  headers?: Record<string, string>;
}): {
  context: ExecutionContext;
  response: { setHeader: jest.Mock; status: jest.Mock };
} {
  const method = overrides?.method ?? "GET";
  const headers = overrides?.headers ?? {};
  const response = {
    setHeader: jest.fn(),
    status: jest.fn(),
  };

  const context = {
    switchToHttp: () => ({
      getRequest: () => ({
        method,
        headers,
      }),
      getResponse: () => response,
    }),
    getClass: () => ({}),
    getHandler: () => ({}),
    getArgs: () => [],
    getArgByIndex: () => ({}),
    switchToRpc: () => ({}) as any,
    switchToWs: () => ({}) as any,
    getType: () => "http" as any,
  } as unknown as ExecutionContext;

  return { context, response };
}

function createMockCallHandler(responseBody?: any): CallHandler {
  return {
    handle: () => of(responseBody ?? { data: "test" }),
  };
}

describe("HttpCacheInterceptor", () => {
  let interceptor: HttpCacheInterceptor;

  beforeEach(() => {
    interceptor = new HttpCacheInterceptor();
  });

  it("should add ETag header to GET responses", async () => {
    const body = { data: "test-response" };
    const { context, response } = createMockExecutionContext();
    const handler = createMockCallHandler(body);

    const result$ = interceptor.intercept(context, handler);
    await lastValueFrom(result$);

    const expectedETag = computeExpectedETag(body);
    expect(response.setHeader).toHaveBeenCalledWith("ETag", expectedETag);
  });

  it("should return 304 when If-None-Match matches ETag", async () => {
    const body = { data: "cached-data" };
    const expectedETag = computeExpectedETag(body);

    const { context, response } = createMockExecutionContext({
      headers: { "if-none-match": expectedETag },
    });
    const handler = createMockCallHandler(body);

    const result$ = interceptor.intercept(context, handler);
    const result = await lastValueFrom(result$);

    expect(response.status).toHaveBeenCalledWith(HttpStatus.NOT_MODIFIED);
    expect(result).toBeUndefined();
  });

  it("should pass through non-GET requests without ETag", async () => {
    const body = { data: "post-response" };
    const { context, response } = createMockExecutionContext({
      method: "POST",
    });
    const handler = createMockCallHandler(body);

    const result$ = interceptor.intercept(context, handler);
    const result = await lastValueFrom(result$);

    expect(result).toEqual(body);
    expect(response.setHeader).not.toHaveBeenCalled();
  });

  it("should set Cache-Control header", async () => {
    const body = { data: "test" };
    const { context, response } = createMockExecutionContext();
    const handler = createMockCallHandler(body);

    const result$ = interceptor.intercept(context, handler);
    await lastValueFrom(result$);

    expect(response.setHeader).toHaveBeenCalledWith(
      "Cache-Control",
      "private, max-age=60",
    );
  });

  it("should use custom Cache-Control value", async () => {
    const customInterceptor = new HttpCacheInterceptor("public, max-age=3600");
    const body = { data: "public-data" };
    const { context, response } = createMockExecutionContext();
    const handler = createMockCallHandler(body);

    const result$ = customInterceptor.intercept(context, handler);
    await lastValueFrom(result$);

    expect(response.setHeader).toHaveBeenCalledWith(
      "Cache-Control",
      "public, max-age=3600",
    );
  });

  it("should return body when If-None-Match does not match", async () => {
    const body = { data: "fresh-data" };
    const { context, response } = createMockExecutionContext({
      headers: { "if-none-match": '"stale-etag"' },
    });
    const handler = createMockCallHandler(body);

    const result$ = interceptor.intercept(context, handler);
    const result = await lastValueFrom(result$);

    expect(result).toEqual(body);
    expect(response.status).not.toHaveBeenCalled();
  });
});
