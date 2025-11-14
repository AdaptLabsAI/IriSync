import pino from 'pino';

/**
 * Log levels for the logger
 */
export enum LogLevel {
  TRACE = 'trace',
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal'
}

/**
 * Check if we're in a build environment
 */
const isBuildTime = 
  process.env.NEXT_PHASE === 'phase-production-build' || 
  process.env.IS_BUILD_PHASE === 'true';

/**
 * Environment-specific logger configuration
 */
const loggerConfig = {
  development: {
    level: 'debug',
    transport: (process.env.NODE_ENV === 'development' || isBuildTime)
      ? undefined // In development or build, don't use transport
      : {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname'
          }
        }
  },
  test: {
    level: 'info',
    transport: isBuildTime ? undefined : {
      target: 'pino/file',
      options: { destination: './logs/test.log' }
    }
  },
  production: {
    level: 'info',
    transport: isBuildTime ? undefined : {
      target: 'pino/file',
      options: { destination: './logs/app.log' }
    }
  }
};

/**
 * Create environment-specific logger configuration
 */
const getLoggerConfig = () => {
  const env = process.env.NODE_ENV || 'development';
  
  // Default to development configuration for unknown environments
  if (!['development', 'test', 'production'].includes(env)) {
    return loggerConfig.development;
  }
  
  return loggerConfig[env as keyof typeof loggerConfig];
};

/**
 * Create the logger instance with environment-specific configuration (lazy-loaded)
 */
let _logger: pino.Logger | null = null;
export const getLogger = (): pino.Logger => {
  if (!_logger) {
    _logger = pino(getLoggerConfig());
  }
  return _logger;
};

// Export a getter-based logger object that lazy-loads
export const logger = {
  trace: (...args: Parameters<pino.Logger['trace']>) => getLogger().trace(...args),
  debug: (...args: Parameters<pino.Logger['debug']>) => getLogger().debug(...args),
  info: (...args: Parameters<pino.Logger['info']>) => getLogger().info(...args),
  warn: (...args: Parameters<pino.Logger['warn']>) => getLogger().warn(...args),
  error: (...args: Parameters<pino.Logger['error']>) => getLogger().error(...args),
  fatal: (...args: Parameters<pino.Logger['fatal']>) => getLogger().fatal(...args),
};

/**
 * Log a request with detailed information
 * @param req The request object
 * @param res The response object
 * @param startTime Request start time (for calculating duration)
 */
export function logRequest(req: any, res: any, startTime: [number, number]) {
  const { method, url, headers, query, body } = req;
  const statusCode = res.statusCode;
  const contentLength = res.getHeader('content-length') || 0;
  const duration = process.hrtime(startTime);
  const durationMs = Math.round((duration[0] * 1e9 + duration[1]) / 1e6);
  
  // Determine log level based on status code
  let level: LogLevel = LogLevel.INFO;
  if (statusCode >= 500) {
    level = LogLevel.ERROR;
  } else if (statusCode >= 400) {
    level = LogLevel.WARN;
  }
  
  // Log request with appropriate level
  logger[level]({
    type: 'request',
    method,
    url,
    query,
    statusCode,
    contentLength,
    durationMs,
    userAgent: headers['user-agent'],
    referer: headers.referer,
    ip: headers['x-forwarded-for'] || req.connection.remoteAddress,
    // Include request body only for non-GET requests and only in development/test
    ...(method !== 'GET' && process.env.NODE_ENV !== 'production'
      ? { body: sanitizeBody(body) }
      : {}),
  }, `${method} ${url} ${statusCode} - ${durationMs}ms`);
}

/**
 * Sanitize request body to remove sensitive information
 * @param body Request body
 * @returns Sanitized body
 */
function sanitizeBody(body: any): any {
  if (!body) return undefined;
  
  // Create a deep copy of the body
  const sanitized = JSON.parse(JSON.stringify(body));
  
  // List of sensitive fields to redact
  const sensitiveFields = [
    'password',
    'passwordConfirmation',
    'newPassword',
    'oldPassword',
    'token',
    'refreshToken',
    'apiKey',
    'secret',
    'creditCard',
    'cardNumber',
    'cvv',
    'pin'
  ];
  
  // Recursively sanitize the body
  const sanitizeObject = (obj: any) => {
    if (!obj || typeof obj !== 'object') return;
    
    Object.keys(obj).forEach(key => {
      if (sensitiveFields.includes(key.toLowerCase())) {
        obj[key] = '[REDACTED]';
      } else if (typeof obj[key] === 'object') {
        sanitizeObject(obj[key]);
      }
    });
  };
  
  sanitizeObject(sanitized);
  return sanitized;
}

/**
 * Request logging middleware for Next.js API routes
 * @param handler API route handler
 * @returns Wrapped handler with request logging
 */
export function withRequestLogging(handler: Function) {
  return async (req: any, res: any) => {
    const startTime = process.hrtime();
    
    // Create a proxy for the response to capture the status code
    const originalEnd = res.end;
    res.end = function(chunk: any, encoding: string) {
      // Log the request after it completes
      logRequest(req, res, startTime);
      
      // Call the original end method
      return originalEnd.call(this, chunk, encoding);
    };
    
    // Call the original handler
    return handler(req, res);
  };
}

/**
 * Logger configuration
 */
export interface LoggerConfig {
  minLevel: LogLevel;
  enableConsole: boolean;
  enableRemote: boolean;
  includeTimestamp: boolean;
  includeCallsite: boolean;
}

/**
 * Logger class
 */
export class Logger {
  private config: LoggerConfig;
  private prefix: string = '';
  
  /**
   * Create a new logger
   * @param configOrPrefix Config object or string prefix
   */
  constructor(configOrPrefix?: Partial<LoggerConfig> | string) {
    // Default configuration
    const defaultConfig: LoggerConfig = {
      minLevel: LogLevel.INFO,
      enableConsole: true,
      enableRemote: process.env.NODE_ENV === 'production',
      includeTimestamp: true,
      includeCallsite: false
    };
    
    if (typeof configOrPrefix === 'string') {
      // String prefix provided
      this.config = defaultConfig;
      this.prefix = configOrPrefix;
    } else {
      // Config object provided
      this.config = {
        ...defaultConfig,
        ...configOrPrefix
      };
    }
  }
  
  /**
   * Set the logger prefix
   * @param prefix Prefix to use for all logs
   */
  setPrefix(prefix: string): void {
    this.prefix = prefix;
  }
  
  /**
   * Log a debug message
   * @param message Log message
   * @param meta Additional metadata
   */
  debug(message: string, meta?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, meta);
  }
  
  /**
   * Log an info message
   * @param message Log message
   * @param meta Additional metadata
   */
  info(message: string, meta?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, meta);
  }
  
  /**
   * Log a warning message
   * @param message Log message
   * @param meta Additional metadata
   */
  warn(message: string, meta?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, meta);
  }
  
  /**
   * Log an error message
   * @param message Log message
   * @param meta Additional metadata
   */
  error(message: string, meta?: Record<string, any>): void {
    this.log(LogLevel.ERROR, message, meta);
  }
  
  /**
   * Log a message at the specified level
   * @param level Log level
   * @param message Log message
   * @param meta Additional metadata
   */
  private log(level: LogLevel, message: string, meta?: Record<string, any>): void {
    // Check minimum log level
    if (this.shouldLog(level)) {
      const timestamp = this.config.includeTimestamp ? new Date().toISOString() : undefined;
      const callsite = this.config.includeCallsite ? this.getCallsite() : undefined;
      
      // Format the log entry
      const logEntry = {
        level,
        message,
        timestamp,
        callsite,
        ...meta
      };
      
      // Console logging
      if (this.config.enableConsole) {
        this.logToConsole(level, message, logEntry);
      }
      
      // Remote logging (in production)
      if (this.config.enableRemote) {
        this.logToRemote(logEntry);
      }
    }
  }
  
  /**
   * Check if a message at this level should be logged
   * @param level Log level to check
   * @returns Whether the message should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.TRACE, LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR, LogLevel.FATAL];
    const minLevelIndex = levels.indexOf(this.config.minLevel);
    const levelIndex = levels.indexOf(level);
    
    return levelIndex >= minLevelIndex;
  }
  
  /**
   * Log to the console
   * @param level Log level
   * @param message Message to log
   * @param meta Additional metadata
   */
  private logToConsole(level: LogLevel, message: string, meta: Record<string, any>): void {
    const timestamp = meta.timestamp ? `[${meta.timestamp}] ` : '';
    const prefixStr = this.prefix ? `[${this.prefix}] ` : '';
    const prefix = `${timestamp}${level.toUpperCase()}:${prefixStr}`;
    
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(`${prefix} ${message}`, meta);
        break;
      case LogLevel.INFO:
        console.info(`${prefix} ${message}`, meta);
        break;
      case LogLevel.WARN:
        console.warn(`${prefix} ${message}`, meta);
        break;
      case LogLevel.ERROR:
        console.error(`${prefix} ${message}`, meta);
        break;
    }
  }
  
  /**
   * Log to remote service (placeholder)
   * @param logEntry Log entry to send
   */
  private logToRemote(logEntry: Record<string, any>): void {
    // Replace the placeholder with actual implementation
    try {
      // Check if Datadog API key is available
      const datadogApiKey = process.env.DATADOG_API_KEY;
      const datadogAppKey = process.env.DATADOG_APP_KEY;
      
      if (!datadogApiKey || !datadogAppKey) {
        // Silently return if no API keys are configured
        return;
      }
      
      // Format log entry for Datadog
      const datadogLog = {
        ddsource: 'nodejs',
        ddtags: `env:${process.env.NODE_ENV || 'development'},service:irisync`,
        hostname: process.env.HOSTNAME || 'unknown',
        message: logEntry.message,
        level: logEntry.level,
        timestamp: logEntry.timestamp ? new Date(logEntry.timestamp).getTime() : Date.now(),
        ...logEntry
      };
      
      // Send log to Datadog
      fetch('https://http-intake.logs.datadoghq.com/api/v2/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'DD-API-KEY': datadogApiKey,
          'DD-APPLICATION-KEY': datadogAppKey
        },
        body: JSON.stringify(datadogLog)
      }).catch(error => {
        // Log to console if sending to Datadog fails
        console.error('Error sending logs to Datadog:', error);
      });
    } catch (error) {
      // Don't let logging errors disrupt the application
      console.error('Error sending log to remote service:', error);
    }
  }
  
  /**
   * Get the callsite (file, line) for the log
   * @returns Callsite string
   */
  private getCallsite(): string {
    try {
      const err = new Error();
      const stack = err.stack?.split('\n');
      
      // Skip the first few frames which are part of the logger itself
      if (stack && stack.length > 3) {
        const callerFrame = stack[3].trim();
        const match = callerFrame.match(/at\s+(.*)\s+\((.*):(\d+):(\d+)\)/);
        
        if (match) {
          const [, fnName, filename, line, column] = match;
          return `${filename}:${line}`;
        }
        
        const simpleMatch = callerFrame.match(/at\s+(.*):(\d+):(\d+)/);
        if (simpleMatch) {
          const [, filename, line, column] = simpleMatch;
          return `${filename}:${line}`;
        }
      }
      
      return '';
    } catch (error) {
      return '';
    }
  }

  /**
   * Log model usage (specialized AI model logging)
   * @param model Model identifier
   * @param tokenCount Token usage count
   * @param userId User ID (optional)
   * @param tier Subscription tier (optional)
   * @param task Task type (optional)
   */
  logModelUsage(
    model: string,
    tokenCount: { input: number; output: number },
    userId?: string,
    tier?: string,
    task?: string
  ): void {
    this.info('AI Model Usage', {
      model,
      inputTokens: tokenCount.input,
      outputTokens: tokenCount.output,
      totalTokens: tokenCount.input + tokenCount.output,
      userId: userId || 'anonymous',
      tier: tier || 'anonymous',
      task: task || 'unknown',
      timestamp: new Date().toISOString()
    });

    // Track usage metrics if enabled and if user is authenticated
    if (userId) {
      try {
        // Implement usage tracking or billing metrics here
        // This could integrate with a quota or billing system
        console.log(`[Metrics] AI usage for user ${userId}: ${tokenCount.input + tokenCount.output} tokens`);
        
        // Example: this.trackUsageMetric('ai.tokens', tokenCount.input + tokenCount.output, userId);
      } catch (error) {
        this.warn('Failed to track AI usage metrics', { error, userId });
      }
    }
  }
}

// Create and export default logger instance
export default new Logger(); 