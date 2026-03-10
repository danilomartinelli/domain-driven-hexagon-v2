import { Cacheable, CACHE_SERVICE } from "../cacheable.decorator";
import { CachePort } from "../cache.port";

function createMockCachePort(): jest.Mocked<CachePort> {
  return {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
    invalidatePattern: jest.fn().mockResolvedValue(undefined),
  };
}

class TestService {
  constructor(cachePort?: CachePort) {
    if (cachePort) {
      (this as any)[CACHE_SERVICE] = cachePort;
    }
  }

  @Cacheable({ key: "users:{0}" })
  async findUser(id: string): Promise<{ id: string; name: string }> {
    return { id, name: `User ${id}` };
  }

  @Cacheable({ key: "items:{0}:{1}", ttlSeconds: 60 })
  async findItem(category: string, id: string): Promise<{ id: string }> {
    return { id };
  }
}

describe("@Cacheable decorator", () => {
  it("should return cached value on cache hit", async () => {
    const mockCache = createMockCachePort();
    const cachedUser = { id: "123", name: "Cached User" };
    mockCache.get.mockResolvedValue(cachedUser);

    const service = new TestService(mockCache);
    const result = await service.findUser("123");

    expect(result).toEqual(cachedUser);
    expect(mockCache.get).toHaveBeenCalledWith("users:123");
    // Should not have called set since cache hit
    expect(mockCache.set).not.toHaveBeenCalled();
  });

  it("should execute method and cache result on cache miss", async () => {
    const mockCache = createMockCachePort();
    mockCache.get.mockResolvedValue(null);

    const service = new TestService(mockCache);
    const result = await service.findUser("456");

    expect(result).toEqual({ id: "456", name: "User 456" });
    expect(mockCache.get).toHaveBeenCalledWith("users:456");
    expect(mockCache.set).toHaveBeenCalledWith(
      "users:456",
      { id: "456", name: "User 456" },
      undefined,
    );
  });

  it("should fall back to method execution when cache unavailable", async () => {
    // No cache port set on the service
    const service = new TestService();
    const result = await service.findUser("789");

    expect(result).toEqual({ id: "789", name: "User 789" });
  });

  it("should replace key template placeholders with arguments", async () => {
    const mockCache = createMockCachePort();
    mockCache.get.mockResolvedValue(null);

    const service = new TestService(mockCache);
    await service.findItem("electronics", "item-42");

    expect(mockCache.get).toHaveBeenCalledWith("items:electronics:item-42");
    expect(mockCache.set).toHaveBeenCalledWith(
      "items:electronics:item-42",
      { id: "item-42" },
      60,
    );
  });

  it("should gracefully handle cache read errors", async () => {
    const mockCache = createMockCachePort();
    mockCache.get.mockRejectedValue(new Error("Redis down"));

    const service = new TestService(mockCache);
    const result = await service.findUser("err-read");

    expect(result).toEqual({ id: "err-read", name: "User err-read" });
  });

  it("should gracefully handle cache write errors", async () => {
    const mockCache = createMockCachePort();
    mockCache.get.mockResolvedValue(null);
    mockCache.set.mockRejectedValue(new Error("Redis down"));

    const service = new TestService(mockCache);
    const result = await service.findUser("err-write");

    expect(result).toEqual({ id: "err-write", name: "User err-write" });
  });
});
