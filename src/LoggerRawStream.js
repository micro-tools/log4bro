var fs = require("graceful-fs");
var chalk = require("chalk");

/***
 * Stream class that enables bunyan to write custom fields to the log
 * e.g. switching time to @timestamp
 * will either write to process.stdout or logfile (depending on a given logFile)
 * @constructor
 */
function LoggerRawStream(logFile) {

    this.buffer = [];
    this.bufferFlushSize = 10;
    this.bufferTimeout = 5000;
    this.logStream = null;

    if (logFile) {
        this.logStream = fs.createWriteStream(logFile, { "flags": "a" });
    }
}

/**
 * (stream) write method, called by bunyan
 * @param rec
 */
LoggerRawStream.prototype.write = function(rec) {

    if (typeof rec !== "object") {
        console.error("error: raw stream got a non-object record: %j", rec);
        return;
    }

    rec = this.alterLogFields(rec);

    this.consoleOutput(rec);
    this.buffer.push(JSON.stringify(rec));
    rec = null;
    this.checkAndFlushBuffer();
};

/**
 * alter method were log objects are re-mapped
 * @param log
 * @returns {*}
 */
LoggerRawStream.prototype.alterLogFields = function(log) {

    //time -> @timestamp
    if (log.time) {
        log["@timestamp"] = JSON.parse(JSON.stringify(log.time));
        delete log.time;
    }

    return log;
};

/**
 * writes a console output if the logstream is not set
 */
LoggerRawStream.prototype.consoleOutput = function(str) {
    if (!this.logStream) {
        var msg = this.levelToName(str.level) + " @ " + str["@timestamp"] + " : " + str.msg + "\n";
        process.stdout.write(this.levelToColorWrap(msg, str.level));
        msg = null;
    }
};

/**
 * turns log-level int-value into a read-able string
 * @param num
 * @returns {*}
 */
LoggerRawStream.prototype.levelToName = function(num) {
    switch (num){
        case 10: return "TRACE";
        case 20: return "DEBUG";
        case 30: return "INFO";
        case 40: return "WARN";
        case 50: return "ERROR";
        case 60: return "FATAL";
        default: return "UNKNOWN";
    }
};

/**
 * turns a string into a colored string, depending on the log-level
 */
LoggerRawStream.prototype.levelToColorWrap = function(str, level) {
    switch (level){
        case 10: return chalk.white(str);
        case 20: return chalk.cyan(str);
        case 30: return chalk.green(str);
        case 40: return chalk.yellow(str);
        case 50: return chalk.red(str);
        case 60: return chalk.purple(str);
        default: return chalk.blue(str);
    }
};

/**
 * checks if the buffer has reached its flushing point, also takes care of the buffer timeout
 */
LoggerRawStream.prototype.checkAndFlushBuffer = function() {

    if (!this.logStream || !this.buffer.length) {
        return; //will do nothing
    }

    if (this.buffer.length >= this.bufferFlushSize) {
        return this.processBuffer(); //will end with a buffer being send to disk
    }

    clearTimeout(this._timeout); //buffer limit not reached, reset a timer to process buffer after timeout, if no more logs are sent
    this._timeout = setTimeout(this.processBuffer.apply(this), this.bufferTimeout);
};

/**
 * writes buffer to file stream
 */
LoggerRawStream.prototype.processBuffer = function() {

    clearTimeout(this._timeout);

    var content = this.buffer.slice();
    this.buffer = [];

    for (var i = 0; i < content.length; i++) {
        this.logStream.write(content[i] + "\n");
    }
};

module.exports = LoggerRawStream;