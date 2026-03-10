export const FEATURE_FLAG_OPTIONS = Symbol("FEATURE_FLAG_OPTIONS");

/** Configuration options for the FeatureFlagModule. */
export interface FeatureFlagOptions {
  /** Static map of feature flag names to their enabled state */
  flags?: Record<string, boolean>;
}
