const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const currentLevel = levels[LOG_LEVEL] || levels.info;

const logger = {
  error: (...args) => {
    if (currentLevel >= levels.error) {
      console.error(`[${new Date().toISOString()}] [ERROR]`, ...args);
    }
  },
  warn: (...args) => {
    if (currentLevel >= levels.warn) {
      console.warn(`[${new Date().toISOString()}] [WARN]`, ...args);
    }
  },
  info: (...args) => {
    if (currentLevel >= levels.info) {
      console.log(`[${new Date().toISOString()}] [INFO]`, ...args);
    }
  },
  debug: (...args) => {
    if (currentLevel >= levels.debug) {
      console.log(`[${new Date().toISOString()}] [DEBUG]`, ...args);
    }
  },
};

module.exports = logger;
