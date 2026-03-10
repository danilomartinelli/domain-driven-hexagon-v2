/** Configuration options for the LoggingModule (Pino-based). */
export interface LoggingOptions {
  /** Pino log level. Default: 'info' */
  level?: string;
  /** Enable pino-pretty for development. Default: false */
  prettyPrint?: boolean;
}
