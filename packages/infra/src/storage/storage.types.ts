export interface StorageOptions {
  driver?: "local" | "s3"; // default 'local'
  localPath?: string; // default './uploads'
  s3Bucket?: string;
  s3Region?: string;
}

export const STORAGE_OPTIONS = Symbol("STORAGE_OPTIONS");
