import winston from "winston";

const isDevelopment = process.env.NODE_ENV !== "production";

const logger = winston.createLogger({
  level: isDevelopment ? "debug" : "info",
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    isDevelopment
      ? winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(
            ({ timestamp, level, message, ...meta }) =>
              `${timestamp} [${level}]: ${message} ${
                Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ""
              }`
          )
        )
      : winston.format.combine(
          winston.format.errors({ stack: true }),
          winston.format.json()
        )
  ),
  defaultMeta: { service: "client-portal" },
  transports: [new winston.transports.Console()],
});

if (!isDevelopment) {
  logger.add(
    new winston.transports.File({
      filename: "logs/error.log",
      level: "error",
      format: winston.format.json(),
    })
  );
  logger.add(
    new winston.transports.File({
      filename: "logs/combined.log",
      format: winston.format.json(),
    })
  );
}

export default logger;
