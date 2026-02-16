/**
 * Logger utility for consistent logging across the platform
 */

const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '../../logs');
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  blue: '\x1b[36m'
};

const getColor = (level) => {
  switch (level) {
    case 'error': return colors.red;
    case 'warn': return colors.yellow;
    case 'info': return colors.green;
    case 'debug': return colors.blue;
    default: return colors.reset;
  }
};

const log = (level, message, data = {}) => {
  const timestamp = new Date().toISOString();
  const logLevel = process.env.LOG_LEVEL || 'info';
  
  if (levels[level] > levels[logLevel]) {
    return; // Skip if below log level
  }

  const logEntry = {
    timestamp,
    level,
    message,
    ...data
  };

  const colorCode = getColor(level);
  const logMessage = `${colorCode}[${timestamp}] [${level.toUpperCase()}] ${message}${colors.reset}`;
  
  // Console output
  console.log(logMessage, data && Object.keys(data).length > 0 ? data : '');

  // File output
  const logFile = path.join(LOG_DIR, `${new Date().toISOString().split('T')[0]}.log`);
  fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
};

module.exports = {
  error: (message, data) => log('error', message, data),
  warn: (message, data) => log('warn', message, data),
  info: (message, data) => log('info', message, data),
  debug: (message, data) => log('debug', message, data)
};
