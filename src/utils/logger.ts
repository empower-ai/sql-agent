import winston, { type Logger } from 'winston';

const logFormat = winston.format.printf(
  ({ level, message, label, timestamp }) => {
    return `${timestamp} [${label}] ${level}: ${message}`;
  }
);

const enableDebugLogging: boolean = Boolean(process.env.ENABLE_DEBUG_LOGGING);
const transports = [
  new winston.transports.Console({
    level: enableDebugLogging ? 'debug' : 'info'
  })
];

const rootLogger = winston.createLogger({
  transports,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.prettyPrint(),
    winston.format.colorize(),
    logFormat
  )
});

export default function getLogger(label: string): Logger {
  return rootLogger.child({ label });
};
