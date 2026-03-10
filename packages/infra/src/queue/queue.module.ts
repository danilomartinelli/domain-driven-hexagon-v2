import { DynamicModule, Module } from "@nestjs/common";
import { BullMqAdapter } from "./bullmq.adapter";
import { QUEUE_PORT } from "./queue.port";
import { QueueOptions, QUEUE_OPTIONS } from "./queue.types";

@Module({})
export class QueueModule {
  static forRoot(options: QueueOptions): DynamicModule {
    return {
      module: QueueModule,
      global: true,
      providers: [
        {
          provide: QUEUE_OPTIONS,
          useValue: options,
        },
        {
          provide: QUEUE_PORT,
          useClass: BullMqAdapter,
        },
      ],
      exports: [QUEUE_PORT],
    };
  }
}
