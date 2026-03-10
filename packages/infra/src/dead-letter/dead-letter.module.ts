import { DynamicModule, Module } from "@nestjs/common";
import { DeadLetterRepository } from "./dead-letter.repository";
import { DeadLetterService, DEAD_LETTER_OPTIONS } from "./dead-letter.service";
import { DeadLetterOptions } from "./dead-letter.types";

@Module({})
export class DeadLetterModule {
  static forRoot(options?: DeadLetterOptions): DynamicModule {
    return {
      module: DeadLetterModule,
      global: true,
      providers: [
        DeadLetterRepository,
        DeadLetterService,
        {
          provide: DEAD_LETTER_OPTIONS,
          useValue: options ?? {},
        },
      ],
      exports: [DeadLetterService],
    };
  }
}
