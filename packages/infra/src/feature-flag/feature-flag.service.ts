import { Inject, Injectable } from "@nestjs/common";
import { FeatureFlagOptions, FEATURE_FLAG_OPTIONS } from "./feature-flag.types";

@Injectable()
export class FeatureFlagService {
  constructor(
    @Inject(FEATURE_FLAG_OPTIONS)
    private readonly options: FeatureFlagOptions,
  ) {}

  isEnabled(flagName: string): boolean {
    if (this.options.flags?.[flagName] !== undefined) {
      return this.options.flags[flagName];
    }
    return process.env[`FEATURE_${flagName}`] === "true";
  }
}
