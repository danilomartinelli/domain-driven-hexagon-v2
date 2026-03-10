import { DynamicModule, Module } from "@nestjs/common";
import { STORAGE_PORT, StorageOptions, STORAGE_OPTIONS } from "./storage.types";
import { LocalStorageAdapter } from "./local-storage.adapter";
import { S3StorageAdapter } from "./s3-storage.adapter";

@Module({})
export class StorageModule {
  static forRoot(options?: StorageOptions): DynamicModule {
    const resolvedOptions = options ?? {};
    const driver = resolvedOptions.driver ?? "local";

    const adapterClass =
      driver === "s3" ? S3StorageAdapter : LocalStorageAdapter;

    return {
      module: StorageModule,
      global: true,
      providers: [
        {
          provide: STORAGE_OPTIONS,
          useValue: resolvedOptions,
        },
        {
          provide: STORAGE_PORT,
          useClass: adapterClass,
        },
      ],
      exports: [STORAGE_PORT],
    };
  }
}
