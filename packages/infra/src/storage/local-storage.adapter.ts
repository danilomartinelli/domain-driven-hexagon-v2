import { Injectable, Inject } from "@nestjs/common";
import { promises as fs } from "fs";
import { join, resolve, dirname } from "path";
import { StoragePort } from "./storage.port";
import { StorageOptions, STORAGE_OPTIONS } from "./storage.types";

@Injectable()
export class LocalStorageAdapter implements StoragePort {
  private readonly basePath: string;

  constructor(@Inject(STORAGE_OPTIONS) options: StorageOptions) {
    this.basePath = resolve(options.localPath ?? "./uploads");
  }

  async upload(
    file: Buffer,
    key: string,
    _contentType: string,
  ): Promise<string> {
    const filePath = join(this.basePath, key);
    const dir = dirname(filePath);

    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, file);

    return filePath;
  }

  async download(key: string): Promise<Buffer> {
    const filePath = join(this.basePath, key);
    return fs.readFile(filePath);
  }

  async delete(key: string): Promise<void> {
    const filePath = join(this.basePath, key);
    await fs.unlink(filePath);
  }

  async getSignedUrl(key: string, _expiresInSeconds: number): Promise<string> {
    const filePath = join(this.basePath, key);
    return `file://${filePath}`;
  }
}
