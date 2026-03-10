export const STORAGE_PORT = Symbol("STORAGE_PORT");
export const STORAGE_OPTIONS = Symbol("STORAGE_OPTIONS");

/** Configuration options for the StorageModule. */
export interface StorageOptions {
  /** Storage backend driver. Default: 'local' */
  driver?: "local" | "s3";
  /** Filesystem path for local storage. Default: './uploads' */
  localPath?: string;
  /** S3 bucket name when using the s3 driver */
  s3Bucket?: string;
  /** AWS region when using the s3 driver */
  s3Region?: string;
}
