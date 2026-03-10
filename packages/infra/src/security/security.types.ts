/** Rate-limiting options for the SecurityModule throttle guard. */
export interface ThrottleOptions {
  /** Rate limit window in milliseconds */
  ttl: number;
  /** Max requests per window */
  limit: number;
}

/** Options for bootstrapping security middleware (Helmet, CORS). */
export interface BootstrapSecurityOptions {
  /** Allowed CORS origins */
  corsOrigins?: string[];
  /** Whether to include credentials in CORS responses */
  corsCredentials?: boolean;
}
