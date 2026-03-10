import { Injectable } from "@nestjs/common";
import { StoragePort } from "./storage.port";

/**
 * S3StorageAdapter is a placeholder/stub for Amazon S3 file storage.
 *
 * To use this adapter in production, install the AWS SDK:
 *   pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
 *
 * Then replace the stub methods with real implementations:
 *
 *   import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
 *   import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
 *
 *   constructor(options: StorageOptions) {
 *     this.client = new S3Client({ region: options.s3Region });
 *     this.bucket = options.s3Bucket!;
 *   }
 *
 *   async upload(file: Buffer, key: string, contentType: string): Promise<string> {
 *     await this.client.send(new PutObjectCommand({
 *       Bucket: this.bucket, Key: key, Body: file, ContentType: contentType,
 *     }));
 *     return `s3://${this.bucket}/${key}`;
 *   }
 *
 *   async download(key: string): Promise<Buffer> {
 *     const { Body } = await this.client.send(new GetObjectCommand({
 *       Bucket: this.bucket, Key: key,
 *     }));
 *     return Buffer.from(await Body!.transformToByteArray());
 *   }
 *
 *   async delete(key: string): Promise<void> {
 *     await this.client.send(new DeleteObjectCommand({
 *       Bucket: this.bucket, Key: key,
 *     }));
 *   }
 *
 *   async getSignedUrl(key: string, expiresInSeconds: number): Promise<string> {
 *     return getSignedUrl(this.client, new GetObjectCommand({
 *       Bucket: this.bucket, Key: key,
 *     }), { expiresIn: expiresInSeconds });
 *   }
 */
@Injectable()
export class S3StorageAdapter implements StoragePort {
  async upload(
    _file: Buffer,
    _key: string,
    _contentType: string,
  ): Promise<string> {
    throw new Error(
      "S3 adapter requires @aws-sdk/client-s3. Install it and configure.",
    );
  }

  async download(_key: string): Promise<Buffer> {
    throw new Error(
      "S3 adapter requires @aws-sdk/client-s3. Install it and configure.",
    );
  }

  async delete(_key: string): Promise<void> {
    throw new Error(
      "S3 adapter requires @aws-sdk/client-s3. Install it and configure.",
    );
  }

  async getSignedUrl(_key: string, _expiresInSeconds: number): Promise<string> {
    throw new Error(
      "S3 adapter requires @aws-sdk/client-s3 and @aws-sdk/s3-request-presigner. Install them and configure.",
    );
  }
}
