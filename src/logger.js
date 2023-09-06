require("dotenv").config();
const SimpleNodeLogger = require("simple-node-logger");
const opts = {
  logFilePath: "../poe-discord/logs/output.log",
  timestampFormat: "YYYY-MM-DD HH:mm:ss.SSS",
  fileNamePattern: "roll-<DATE>.log",
};

console.log(`Log filepath is `, opts.logFilePath);

const log = SimpleNodeLogger.createSimpleLogger(opts);
log.setLevel(process.env.LOG_LEVEL);

function getLogger() {
  return log;
}

module.exports = {
  getLogger,
};
