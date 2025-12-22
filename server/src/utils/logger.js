const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

const getTimestamp = () => {
  return new Date().toISOString();
};

const formatMessage = (level, message, color) => {
  return `${colors.bright}[${getTimestamp()}]${colors.reset} ${color}[${level}]${colors.reset} ${message}`;
};

const logger = {
  info: (message) => {
    console.log(formatMessage('INFO', message, colors.green));
  },
  
  warn: (message) => {
    console.warn(formatMessage('WARN', message, colors.yellow));
  },
  
  error: (message) => {
    console.error(formatMessage('ERROR', message, colors.red));
  },
  
  debug: (message) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(formatMessage('DEBUG', message, colors.cyan));
    }
  },
  
  socket: (message) => {
    console.log(formatMessage('SOCKET', message, colors.magenta));
  },
};

export default logger;
