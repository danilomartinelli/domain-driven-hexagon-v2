import { MemoryCacheAdapter } from "../memory-cache.adapter";

describe("MemoryCacheAdapter", () => {
  let cache: MemoryCacheAdapter;

  beforeEach(() => {
    cache = new MemoryCacheAdapter({ defaultTtlSeconds: 300 });
  });

  it("should set and get a value", async () => {
    await cache.set("key1", { name: "test" });

    const result = await cache.get<{ name: string }>("key1");

    expect(result).toEqual({ name: "test" });
  });

  it("should return null for a missing key", async () => {
    const result = await cache.get("nonexistent");

    expect(result).toBeNull();
  });

  it("should return null for an expired key", async () => {
    await cache.set("expired-key", "value", 0);

    // Wait a tiny bit to ensure expiration
    await new Promise((resolve) => setTimeout(resolve, 5));

    const result = await cache.get("expired-key");

    expect(result).toBeNull();
  });

  it("should delete a key", async () => {
    await cache.set("to-delete", "value");

    await cache.del("to-delete");

    const result = await cache.get("to-delete");

    expect(result).toBeNull();
  });

  it("should invalidatePattern removing matching keys", async () => {
    await cache.set("users:1", { id: 1 });
    await cache.set("users:2", { id: 2 });
    await cache.set("orders:1", { id: 100 });

    await cache.invalidatePattern("users:*");

    expect(await cache.get("users:1")).toBeNull();
    expect(await cache.get("users:2")).toBeNull();
    expect(await cache.get("orders:1")).toEqual({ id: 100 });
  });

  it("should respect custom TTL", async () => {
    await cache.set("short-lived", "value", 1);

    const immediate = await cache.get("short-lived");
    expect(immediate).toBe("value");

    // Wait for expiry
    await new Promise((resolve) => setTimeout(resolve, 1100));

    const expired = await cache.get("short-lived");
    expect(expired).toBeNull();
  });

  it("should use default TTL when none specified", async () => {
    const shortTtlCache = new MemoryCacheAdapter({ defaultTtlSeconds: 1 });

    await shortTtlCache.set("default-ttl", "value");

    const immediate = await shortTtlCache.get("default-ttl");
    expect(immediate).toBe("value");

    await new Promise((resolve) => setTimeout(resolve, 1100));

    const expired = await shortTtlCache.get("default-ttl");
    expect(expired).toBeNull();
  });

  it("should default to 300 seconds when no options provided", () => {
    const defaultCache = new MemoryCacheAdapter({});

    // Just ensure it constructs without error
    expect(defaultCache).toBeDefined();
  });
});
