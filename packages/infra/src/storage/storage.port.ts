export interface StoragePort {
  upload(file: Buffer, key: string, contentType: string): Promise<string>;
  download(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  getSignedUrl(key: string, expiresInSeconds: number): Promise<string>;
}

export const STORAGE_PORT = Symbol("STORAGE_PORT");
