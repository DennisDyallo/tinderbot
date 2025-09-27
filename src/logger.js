class Logger {
  constructor(level = "info") {
    this.levels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3,
    };
    this.level = level;
  }

  formatMessage(level, message, ...args) {
    const timestamp = new Date().toISOString().slice(11, 21); // HH:MM:SS
    const prefix = `[${timestamp}] ${level.toUpperCase()}:`;
    return [prefix, message, ...args];
  }

  shouldLog(level) {
    return this.levels[level] <= this.levels[this.level];
  }

  error(message, ...args) {
    if (this.shouldLog("error")) {
      console.error(...this.formatMessage("error", message, ...args));
    }
  }

  warn(message, ...args) {
    if (this.shouldLog("warn")) {
      console.warn(...this.formatMessage("warn", message, ...args));
    }
  }

  info(message, ...args) {
    if (this.shouldLog("info")) {
      console.info(...this.formatMessage("info", message, ...args));
    }
  }

  debug(message, ...args) {
    if (this.shouldLog("debug")) {
      console.debug(...this.formatMessage("debug", message, ...args));
    }
  }

  // Convenience methods for existing emoji patterns
  state(message, ...args) {
    this.info(`🔄 ${message}`, ...args);
  }

  success(message, ...args) {
    this.info(`✅ ${message}`, ...args);
  }

  failure(message, ...args) {
    this.error(`❌ ${message}`, ...args);
  }

  browser(message, ...args) {
    this.debug(`🌐 ${message}`, ...args);
  }
}

// Create singleton instance
const logger = new Logger(process.env.info_LEVEL || "info");
global.logger = logger; // Expose globally for browser context if needed
module.exports = logger;
