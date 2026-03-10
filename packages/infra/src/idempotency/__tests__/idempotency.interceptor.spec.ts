import { IdempotencyInterceptor } from "../idempotency.interceptor";
import { IdempotencyRepository } from "../idempotency.repository";
import { CallHandler, ExecutionContext } from "@nestjs/common";
import { of, lastValueFrom, throwError } from "rxjs";

function createMockExecutionContext(overrides?: {
  method?: string;
  headers?: Record<string, string>;
  statusCode?: number;
}): ExecutionContext {
  const method = overrides?.method ?? "POST";
  const headers = overrides?.headers ?? {};
  const statusCode = overrides?.statusCode ?? 200;

  return {
    switchToHttp: () => ({
      getRequest: () => ({
        method,
        headers,
      }),
      getResponse: () => ({
        statusCode,
      }),
    }),
    getClass: () => ({}),
    getHandler: () => ({}),
    getArgs: () => [],
    getArgByIndex: () => ({}),
    switchToRpc: () => ({}) as any,
    switchToWs: () => ({}) as any,
    getType: () => "http" as any,
  } as unknown as ExecutionContext;
}

function createMockCallHandler(response?: any): CallHandler {
  return {
    handle: () => of(response ?? { id: "test-id" }),
  };
}

function createMockErrorCallHandler(error: Error): CallHandler {
  return {
    handle: () => throwError(() => error),
  };
}

describe("IdempotencyInterceptor", () => {
  let interceptor: IdempotencyInterceptor;
  let mockRepository: jest.Mocked<
    Pick<IdempotencyRepository, "findByKey" | "save">
  >;

  beforeEach(() => {
    mockRepository = {
      findByKey: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockResolvedValue(undefined),
    };

    interceptor = new IdempotencyInterceptor(mockRepository as any, {});
  });

  it("passes through GET requests without checking idempotency", async () => {
    const context = createMockExecutionContext({ method: "GET" });
    const handler = createMockCallHandler({ data: "get-response" });

    const result$ = await interceptor.intercept(context, handler);
    const result = await lastValueFrom(result$);

    expect(result).toEqual({ data: "get-response" });
    expect(mockRepository.findByKey).not.toHaveBeenCalled();
    expect(mockRepository.save).not.toHaveBeenCalled();
  });

  it("passes through DELETE requests without checking idempotency", async () => {
    const context = createMockExecutionContext({ method: "DELETE" });
    const handler = createMockCallHandler({ data: "delete-response" });

    const result$ = await interceptor.intercept(context, handler);
    const result = await lastValueFrom(result$);

    expect(result).toEqual({ data: "delete-response" });
    expect(mockRepository.findByKey).not.toHaveBeenCalled();
  });

  it("passes through POST requests with no Idempotency-Key header", async () => {
    const context = createMockExecutionContext({
      method: "POST",
      headers: {},
    });
    const handler = createMockCallHandler({ id: "new-entity" });

    const result$ = await interceptor.intercept(context, handler);
    const result = await lastValueFrom(result$);

    expect(result).toEqual({ id: "new-entity" });
    expect(mockRepository.findByKey).not.toHaveBeenCalled();
    expect(mockRepository.save).not.toHaveBeenCalled();
  });

  it("returns cached response when key exists in repository", async () => {
    const cachedBody = { id: "cached-id", name: "cached" };
    mockRepository.findByKey.mockResolvedValue({
      key: "test-key-123",
      responseStatus: 201,
      responseBody: cachedBody,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 86400000),
    });

    const context = createMockExecutionContext({
      method: "POST",
      headers: { "idempotency-key": "test-key-123" },
    });
    const handler = createMockCallHandler();

    const result$ = await interceptor.intercept(context, handler);
    const result = await lastValueFrom(result$);

    expect(result).toEqual(cachedBody);
    expect(mockRepository.findByKey).toHaveBeenCalledWith("test-key-123");
    expect(mockRepository.save).not.toHaveBeenCalled();
  });

  it("executes handler and caches response when key is new", async () => {
    const responseBody = { id: "new-id", status: "created" };
    const context = createMockExecutionContext({
      method: "POST",
      headers: { "idempotency-key": "new-key-456" },
      statusCode: 201,
    });
    const handler = createMockCallHandler(responseBody);

    const result$ = await interceptor.intercept(context, handler);
    const result = await lastValueFrom(result$);

    expect(result).toEqual(responseBody);
    expect(mockRepository.findByKey).toHaveBeenCalledWith("new-key-456");
    expect(mockRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        key: "new-key-456",
        responseStatus: 201,
        responseBody,
      }),
    );
  });

  it("does not cache error responses", async () => {
    const context = createMockExecutionContext({
      method: "POST",
      headers: { "idempotency-key": "error-key-789" },
    });
    const handler = createMockErrorCallHandler(
      new Error("Something went wrong"),
    );

    const result$ = await interceptor.intercept(context, handler);

    await expect(lastValueFrom(result$)).rejects.toThrow(
      "Something went wrong",
    );
    expect(mockRepository.findByKey).toHaveBeenCalledWith("error-key-789");
    expect(mockRepository.save).not.toHaveBeenCalled();
  });

  it("works with PUT requests", async () => {
    const context = createMockExecutionContext({
      method: "PUT",
      headers: { "idempotency-key": "put-key-101" },
    });
    const handler = createMockCallHandler({ updated: true });

    const result$ = await interceptor.intercept(context, handler);
    const result = await lastValueFrom(result$);

    expect(result).toEqual({ updated: true });
    expect(mockRepository.findByKey).toHaveBeenCalledWith("put-key-101");
    expect(mockRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        key: "put-key-101",
        responseBody: { updated: true },
      }),
    );
  });

  it("uses custom TTL from options", async () => {
    const customTtlMs = 3600000; // 1 hour
    const interceptorWithTtl = new IdempotencyInterceptor(
      mockRepository as any,
      { ttlMs: customTtlMs },
    );

    const context = createMockExecutionContext({
      method: "POST",
      headers: { "idempotency-key": "ttl-key" },
      statusCode: 200,
    });
    const handler = createMockCallHandler({ data: "test" });

    const beforeTime = Date.now();
    const result$ = await interceptorWithTtl.intercept(context, handler);
    await lastValueFrom(result$);
    const afterTime = Date.now();

    expect(mockRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        key: "ttl-key",
      }),
    );

    const savedRecord = mockRepository.save.mock.calls[0][0];
    const expectedExpiresMin = beforeTime + customTtlMs;
    const expectedExpiresMax = afterTime + customTtlMs;
    const actualExpires = savedRecord.expiresAt.getTime();

    expect(actualExpires).toBeGreaterThanOrEqual(expectedExpiresMin);
    expect(actualExpires).toBeLessThanOrEqual(expectedExpiresMax);
  });

  it("does not fail the request if caching fails", async () => {
    mockRepository.save.mockRejectedValue(new Error("DB write failed"));

    const context = createMockExecutionContext({
      method: "POST",
      headers: { "idempotency-key": "fail-cache-key" },
    });
    const responseBody = { id: "still-works" };
    const handler = createMockCallHandler(responseBody);

    const result$ = await interceptor.intercept(context, handler);
    const result = await lastValueFrom(result$);

    expect(result).toEqual(responseBody);
  });
});
