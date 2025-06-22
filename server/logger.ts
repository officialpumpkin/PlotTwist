
import fs from 'fs';
import path from 'path';

export interface LogLevel {
  ERROR: 'ERROR';
  WARN: 'WARN';
  INFO: 'INFO';
  DEBUG: 'DEBUG';
}

export const LOG_LEVELS: LogLevel = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG'
};

export interface LogEntry {
  timestamp: string;
  level: keyof LogLevel;
  message: string;
  data?: any;
  context?: {
    userId?: string;
    sessionId?: string;
    requestId?: string;
    method?: string;
    url?: string;
    userAgent?: string;
    ip?: string;
  };
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string | number;
  };
}

class Logger {
  private logsDir: string;

  constructor() {
    this.logsDir = path.join(process.cwd(), 'logs');
    this.ensureLogsDir();
  }

  private ensureLogsDir() {
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
  }

  private writeToFile(filename: string, entry: LogEntry) {
    const logFile = path.join(this.logsDir, filename);
    const logLine = JSON.stringify(entry) + '\n';
    
    try {
      fs.appendFileSync(logFile, logLine);
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  private formatLogEntry(level: keyof LogLevel, message: string, data?: any, context?: any, error?: Error): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(data && { data }),
      ...(context && { context }),
      ...(error && {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
          code: (error as any).code
        }
      })
    };

    return entry;
  }

  error(message: string, error?: Error, context?: any, data?: any) {
    const entry = this.formatLogEntry('ERROR', message, data, context, error);
    console.error(`[${entry.timestamp}] ERROR: ${message}`, error?.stack || '', data || '');
    this.writeToFile(`error-${new Date().toISOString().split('T')[0]}.log`, entry);
    this.writeToFile(`all-${new Date().toISOString().split('T')[0]}.log`, entry);
  }

  warn(message: string, data?: any, context?: any) {
    const entry = this.formatLogEntry('WARN', message, data, context);
    console.warn(`[${entry.timestamp}] WARN: ${message}`, data || '');
    this.writeToFile(`warn-${new Date().toISOString().split('T')[0]}.log`, entry);
    this.writeToFile(`all-${new Date().toISOString().split('T')[0]}.log`, entry);
  }

  info(message: string, data?: any, context?: any) {
    const entry = this.formatLogEntry('INFO', message, data, context);
    console.log(`[${entry.timestamp}] INFO: ${message}`, data || '');
    this.writeToFile(`info-${new Date().toISOString().split('T')[0]}.log`, entry);
    this.writeToFile(`all-${new Date().toISOString().split('T')[0]}.log`, entry);
  }

  debug(message: string, data?: any, context?: any) {
    if (process.env.NODE_ENV === 'development') {
      const entry = this.formatLogEntry('DEBUG', message, data, context);
      console.debug(`[${entry.timestamp}] DEBUG: ${message}`, data || '');
      this.writeToFile(`debug-${new Date().toISOString().split('T')[0]}.log`, entry);
      this.writeToFile(`all-${new Date().toISOString().split('T')[0]}.log`, entry);
    }
  }

  // Database operation logging
  dbOperation(operation: string, table: string, data?: any, error?: Error, context?: any) {
    const message = `Database ${operation} on ${table}`;
    if (error) {
      this.error(message, error, context, data);
    } else {
      this.debug(message, data, context);
    }
  }

  // API request logging
  apiRequest(method: string, url: string, statusCode: number, duration: number, context?: any, error?: Error) {
    const message = `${method} ${url} ${statusCode} in ${duration}ms`;
    if (error || statusCode >= 500) {
      this.error(message, error, context);
    } else if (statusCode >= 400) {
      this.warn(message, { statusCode, duration }, context);
    } else {
      this.info(message, { statusCode, duration }, context);
    }
  }

  // Authentication logging
  authEvent(event: string, userId?: string, success: boolean = true, error?: Error, context?: any) {
    const message = `Authentication ${event} ${success ? 'succeeded' : 'failed'}`;
    if (!success || error) {
      this.warn(message, { userId, event }, context);
    } else {
      this.info(message, { userId, event }, context);
    }
  }
}

export const logger = new Logger();
