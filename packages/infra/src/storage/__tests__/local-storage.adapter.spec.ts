import { LocalStorageAdapter } from "../local-storage.adapter";
import { join } from "path";
import { promises as fs } from "fs";
import { tmpdir } from "os";
import { randomUUID } from "crypto";

describe("LocalStorageAdapter", () => {
  let adapter: LocalStorageAdapter;
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `storage-test-${randomUUID()}`);
    adapter = new LocalStorageAdapter({ localPath: testDir });
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it("upload creates file and returns path", async () => {
    const content = Buffer.from("hello world");
    const key = "test/file.txt";

    const result = await adapter.upload(content, key, "text/plain");

    expect(result).toBe(join(testDir, key));
    const stored = await fs.readFile(join(testDir, key));
    expect(stored.toString()).toBe("hello world");
  });

  it("download reads file content", async () => {
    const content = Buffer.from("download test");
    const key = "downloads/doc.txt";

    await adapter.upload(content, key, "text/plain");
    const result = await adapter.download(key);

    expect(result.toString()).toBe("download test");
  });

  it("delete removes file", async () => {
    const content = Buffer.from("to be deleted");
    const key = "deleteme.txt";

    await adapter.upload(content, key, "text/plain");
    await adapter.delete(key);

    await expect(fs.access(join(testDir, key))).rejects.toThrow();
  });

  it("upload creates directory if missing", async () => {
    const content = Buffer.from("nested");
    const key = "deep/nested/dir/file.txt";

    await adapter.upload(content, key, "text/plain");

    const stored = await fs.readFile(join(testDir, key));
    expect(stored.toString()).toBe("nested");
  });

  it("getSignedUrl returns file:// URL", async () => {
    const key = "signed/test.txt";

    const url = await adapter.getSignedUrl(key, 3600);

    expect(url).toBe(`file://${join(testDir, key)}`);
  });
});
