/**
 * Global mock for nestjs-request-context.
 * Must be loaded via jest setupFilesAfterEnv to prevent RequestContextService
 * from throwing "Cannot read properties of undefined" errors in unit tests.
 *
 * RequestContextService.getContext() is called by ExceptionBase, Command,
 * DomainEvent, and SqlRepositoryBase constructors.
 */
jest.mock("nestjs-request-context", () => ({
  RequestContext: {
    currentContext: {
      req: {
        requestId: "test-request-id",
        transactionConnection: undefined,
      },
    },
  },
}));
