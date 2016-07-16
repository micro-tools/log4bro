var fs = require("graceful-fs");
var chalk = require("chalk");

/***
 * Stream class that enables bunyan to write custom fields to the log
 * e.g. switching time to @timestamp
 * will either write to process.stdout or logfile (depending on a given logFile)
 * @constructor
 */
function LoggerRawStream(logFile, logFieldOptions, dockerMode) {

    this.buffer = [];
    this.bufferFlushSize = 10;
    this.bufferTimeout = 5000;
    this.logFieldOptions = logFieldOptions || null;
    this.logFieldKeys = this.logFieldOptions ? Object.keys(logFieldOptions) : null; //do once only
    this.dockerMode = dockerMode || false;

    this.logStream = null;
    this.outStream = null;

    if (logFile && !dockerMode) {
        this.logStream = fs.createWriteStream(logFile, { "flags": "a" });
    } else {
        this.outStream = process.stdout; //get ref and stop using the getter
    }
}

/**
 * (stream) write method, called by bunyan
 * @param rec
 */
LoggerRawStream.prototype.write = function(rec) {

    if (typeof rec !== "object") {
        console.log("[log4bro] error: raw stream got a non-object record: %j", rec);
        return;
    }

    rec = this.alterLogFields(rec);

    this.dockerMode ? this.jsonConsoleOutput(rec) : this.consoleOutput(rec);

    if(this.logStream){
        this.buffer.push(JSON.stringify(rec));
        rec = null;
        this.checkAndFlushBuffer();
    }
};

/**
 * alter method were log objects are re-mapped
 * @param log
 * @returns {*}
 */
LoggerRawStream.prototype.alterLogFields = function(_log) {

    //TODO hmm..
    var log = JSON.parse(JSON.stringify(_log)); //work on copy

    //time -> @timestamp
    if (log.time) {
        log["@timestamp"] = _log.time;
        delete log.time;
    }

    //remove v:0 field
    if(log.v !== null){
        delete log.v;
    }

    //remove logger name field
    if(log.name !== null){
        delete log.name;
    }

    //level -> loglevel_value(int) + loglevel(string)
    if(log.level !== null){
        log["loglevel"] = this.levelToName(log.level);
        log["loglevel_value"] = _log.level;
        delete log.level;
    }

    var jmsg = this._isJsonString(log.msg);
    if(jmsg != null){
        log["msg_json"] = jmsg;
        delete log.msg;
    }

    //re-locate the correlationId
    if(jmsg && !log.correlationId && jmsg.correlationId){

        log["correlationId"] = jmsg.correlationId;
        delete log.msg_json.correlationId;

        //and msg field
        if(jmsg.msg){
            log["msg"] = jmsg.msg;
            jmsg = null;
            delete log.msg_json.msg;
        }
    }

    if(this.logFieldKeys){
        for(var i = 0; i < this.logFieldKeys.length; i++){
            log[this.logFieldKeys[i]] = this.logFieldOptions[this.logFieldKeys[i]];
        }
    }

    return log;
};

/**
 * parses json if possible
 */
LoggerRawStream.prototype._isJsonString = function(str) {
    var obj = null;
    try {
        obj = JSON.parse(str);
    } catch (e) {
        //empty
    }
    return obj;
};

/**
 * writes a text console output if the logstream is not set
 */
LoggerRawStream.prototype.consoleOutput = function(obj) {

    if (!this.logStream) {
        var msg = this.levelToName(obj.level ? obj.level : obj.loglevel_value)
            + " @ " + obj["@timestamp"] + " : " + (obj.msg ? obj.msg : JSON.stringify(obj.msg_json)) + "\n";
        msg = this.levelToColorWrap(msg, obj.level ? obj.level : obj.loglevel_value);
        this.outStream.write(msg);
        msg = null;
    }
};

/**
 * writes a json console output if the logstream is not set
 */
LoggerRawStream.prototype.jsonConsoleOutput = function(obj) {

    if (!this.logStream) {
        var msg = this.levelToColorWrap(JSON.stringify(obj), obj.level ? obj.level : obj.loglevel_value) + "\n";
        this.outStream.write(msg);
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
        case 60: return chalk.red(str);
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

    var self = this;
    this._timeout = setTimeout(function(){ self.processBuffer(); }, this.bufferTimeout);
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