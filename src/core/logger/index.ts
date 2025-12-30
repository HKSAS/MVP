/**
 * Logger structuré pour l'application
 * 
 * Utilisation :
 *   logger.info('User logged in', { userId: '123' })
 *   logger.error('Failed to scrape', { url, error })
 *   logger.warn('Rate limit approaching', { ip, count })
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug'

interface LogMeta {
  [key: string]: any
}

class Logger {
  private formatMessage(level: LogLevel, message: string, meta?: LogMeta): string {
    const timestamp = new Date().toISOString()
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : ''
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`
  }

  info(message: string, meta?: LogMeta): void {
    if (process.env.NODE_ENV !== 'production') {
      console.info(this.formatMessage('info', message, meta))
    }
    // En production, vous pourriez envoyer à un service externe (Datadog, etc.)
  }

  warn(message: string, meta?: LogMeta): void {
    console.warn(this.formatMessage('warn', message, meta))
  }

  error(message: string, meta?: LogMeta): void {
    console.error(this.formatMessage('error', message, meta))
  }

  debug(message: string, meta?: LogMeta): void {
    if (process.env.NODE_ENV === 'development') {
      console.debug(this.formatMessage('debug', message, meta))
    }
  }
}

export const logger = new Logger()

/**
 * Logger spécialisé pour les routes API
 */
export function createRouteLogger(route: string) {
  const prefix = `[API ${route}]`
  return {
    info: (message: string, meta?: LogMeta) => logger.info(`${prefix} ${message}`, meta),
    warn: (message: string, meta?: LogMeta) => logger.warn(`${prefix} ${message}`, meta),
    error: (message: string, meta?: LogMeta) => logger.error(`${prefix} ${message}`, meta),
    debug: (message: string, meta?: LogMeta) => logger.debug(`${prefix} ${message}`, meta),
  }
}

