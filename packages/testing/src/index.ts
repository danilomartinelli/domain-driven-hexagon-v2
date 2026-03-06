// @repo/testing — shared test toolkit

// Matchers — import in setupFilesAfterEnv
export * from "./matchers";

// Generic factories
export { createBaseEntityProps } from "./factories";

// Fakes for unit testing
export { InMemoryRepository, FakeEventBus } from "./fakes";
