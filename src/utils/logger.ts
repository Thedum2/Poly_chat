type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerConfig {
  isDevelopment: boolean;
  prefix?: string;
}

class Logger {
  private isDevelopment: boolean;
  private prefix: string;

  constructor(config: LoggerConfig = { isDevelopment: true }) {
    this.isDevelopment = config.isDevelopment;
    this.prefix = config.prefix || '';
  }

  setDevelopmentMode(isDevelopment: boolean): void {
    this.isDevelopment = isDevelopment;
  }

  debug(message: string, ...args: any[]): void {
    if (this.isDevelopment) {
      console.debug(this.formatMessage(message), ...args);
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.isDevelopment) {
      console.log(this.formatMessage(message), ...args);
    }
  }

  warn(message: string, ...args: any[]): void {
    console.warn(this.formatMessage(message), ...args);
  }

  error(message: string, ...args: any[]): void {
    console.error(this.formatMessage(message), ...args);
  }

  private formatMessage(message: string): string {
    return this.prefix ? `${this.prefix} ${message}` : message;
  }
}

export const createLogger = (prefix?: string, isDevelopment?: boolean): Logger => {
  return new Logger({
    prefix,
    isDevelopment: isDevelopment ?? process.env.NODE_ENV !== 'production'
  });
};

export const logger = createLogger();
