/**
 * Unit test setup — mocks nestjs-request-context so that
 * ExceptionBase, Command, DomainEvent constructors don't throw.
 * Does NOT bootstrap the NestJS application or connect to a database.
 */
jest.mock('nestjs-request-context', () => {
  class RequestContext {}
  (RequestContext as any).currentContext = {
    req: {
      requestId: 'test-request-id',
      transactionConnection: undefined,
    },
  };
  return { RequestContext };
});
