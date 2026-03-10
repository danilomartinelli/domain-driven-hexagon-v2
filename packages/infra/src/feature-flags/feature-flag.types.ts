export const FEATURE_FLAG_OPTIONS = Symbol("FEATURE_FLAG_OPTIONS");

export interface FeatureFlagOptions {
  flags?: Record<string, boolean>;
}
