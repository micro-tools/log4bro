var fs = require("fs");
var bunyan = require("bunyan");

var RawStream = require("./LoggerRawStream.js");
var Middlewares = require("./ExpressMiddlewares.js");

const LOG_LEVELS = ["TRACE", "DEBUG", "INFO", "WARN", "ERROR", "FATAL"];

function ServiceLogger(loggerName, silence, logDir, productionMode, dockerMode, varKey, logFieldOptions, level, serviceName) {

    if(typeof loggerName === "object" && arguments.length === 1){
        productionMode = loggerName.production || loggerName.productionMode; //support fallback
        logDir = loggerName.logDir;
        silence = loggerName.silence;
        dockerMode = loggerName.docker || loggerName.dockerMode; //support fallback
        varKey = loggerName.varKey;
        logFieldOptions = loggerName.logFieldOptions;
        level = loggerName.level || loggerName.logLevel; //support fallback to older key named "logLevel"
        serviceName = loggerName.serviceName;

        loggerName = loggerName.name; //last
    }

    if(level && LOG_LEVELS.indexOf(level) === -1){
        console.log("[log4bro] level is not a supported logLevel: " + level + ", defaulting to INFO.");
        level = "INFO";
    }

    this.productionMode = productionMode || false;
    this.varKey = varKey || "LOG";
    this.dockerMode = dockerMode || false;
    this.logFieldOptions = logFieldOptions || null;
    this.silence = silence || false;
    this.logDir = logDir || "logs";
    this.logLevel = level || (productionMode ? "WARN" : "DEBUG"); //level -> logLevel (dockerconfig cannot set camelcase)
    this.serviceName = serviceName || "undefined";

    this.skipDebug = false;
    if(this.silence || (this.productionMode &&
        !(this.logLevel === "TRACE" || this.logLevel === "DEBUG"))){
        this.skipDebug = true;
    }

    if (!loggerName && !this.productionMode) {
        this.loggerName = loggerName || "dev";
    } else {
        this.loggerName = loggerName || "prod";
    }

    this._streams = null;
    this.LOG = this._createLogger();

    this.LOG.info("[log4bro] Logger is: in-prod=" + this.productionMode +
    ", in-docker:" + this.dockerMode +
    ", level=" + this.logLevel +
    ", skipDebug=" + this.skipDebug);

    this.setGlobal();
}

ServiceLogger.prototype._createLogger = function(){

    this._streams = []; //clear

    this._streams.push(
        {
            "type": "raw",
            "level": this.logLevel,
            "stream": new RawStream(null, this.logFieldOptions, this.dockerMode) //will only write to console/stdout
        }
    );

    if(!this.dockerMode){

        //console.log("[log4bro] Logger is not in docker mode.");
        this.createLoggingDir();

        this._streams.push({
            "type": "raw",
            "level": this.logLevel,
            "stream": new RawStream(this.logDir + "/service-log.json", this.logFieldOptions) //will only write to logfile
        });
    }

    return bunyan.createLogger({
        "name": this.loggerName,
        "streams": this._streams,
        "src": false
    });
};

ServiceLogger.prototype.createChild = function(additionalFields) {
    const that = this;
    return {
        trace: function (message) { that._trace(message, additionalFields) },
        debug: function (message) { that._debug(message, additionalFields) } ,
        info: function (message) { that._info(message, additionalFields) },
        warn: function (message) { that._warn(message, additionalFields) },
        error: function (message) { that._error(message, additionalFields) },
        fatal: function (message) { that._fatal(message, additionalFields) }
    }
};

ServiceLogger.prototype.changeLogLevel = function(level){

    if(level && LOG_LEVELS.indexOf(level) === -1){
        this.LOG.error("[log4bro] level is not a supported logLevel: " + level + ", defaulting to INFO.");
        return;
    }

    if(level === "DEBUG" || level === "TRACE"){
        this.skipDebug = false;
    } else {
        this.skipDebug = true;
    }

    this.LOG.info("[log4bro] changing loglevel from " + this.logLevel + " to " + level + ".");
    this.logLevel = level;
    this.LOG = this._createLogger();
};

ServiceLogger.prototype.createLoggingDir = function() {

    if (!fs.existsSync(this.logDir)) {
        //console.log("[log4bro] Logs folder does not exists creating " + this.logDir + " make sure to set path in blammo.xml.");
        fs.mkdirSync(this.logDir);
        return;
    }

    //console.log("[log4bro] Logs folder exists, clearing " + this.logDir);

    var files = null;
    try { files = fs.readdirSync(this.logDir); }
    catch (e) { return; }

    if (files.length > 0)
        for (var i = 0; i < files.length; i++) {
            var filePath = this.logDir + "/" + files[i];
            if (fs.statSync(filePath).isFile())
                fs.unlinkSync(filePath);
            else
                fs.rmDir(filePath);
        }
};

ServiceLogger.prototype.applyMiddlewareAccessLog = function(expressApp){

    if(!expressApp || typeof expressApp !== "function"){
        throw new Error("[log4bro] ExpressApp is null or not an object, make sure you pass an instance of express() to applyMiddleware.");
    }

    expressApp.use(Middlewares.accessLogMiddleware(this.serviceName, this.dockerMode));
    return expressApp;
};

ServiceLogger.prototype.applyMiddlewareAccessLogFile = function(expressApp, logFilePath){

    if(!expressApp || typeof expressApp !== "function"){
        throw new Error("[log4bro] ExpressApp is null or not an object, make sure you pass an instance of express() to applyMiddleware.");
    }

    if(!logFilePath){
        throw new Error("[log4bro] logFilePath is empty on applyMiddlewareAccessLogFile.");
    }

    expressApp.use(Middlewares.accessLogMiddlewareFile(logFilePath));
    return expressApp;
};

ServiceLogger.prototype.setGlobal = function() {
    global[this.varKey] = this;
};

ServiceLogger.prototype._trace = function(message, additionalFields) {
    if (this.skipDebug) return; //save memory & cpu
    this._moveMsgObject("trace", message, additionalFields);
};

ServiceLogger.prototype._debug = function(message, additionalFields) {
    if (this.skipDebug) return; //save memory & cpu
    this._moveMsgObject("debug", message, additionalFields);
};

ServiceLogger.prototype._info = function(message, additionalFields) {
    if (this.silence) return;
    this._moveMsgObject("info", message, additionalFields);
};

ServiceLogger.prototype._warn = function(message, additionalFields) {
    if (this.silence) return;
    this._moveMsgObject("warn", message, additionalFields);
};

ServiceLogger.prototype._error = function(message, additionalFields) {
    if (this.silence) return;
    this._moveMsgObject("error", message, additionalFields);
};

ServiceLogger.prototype._fatal = function(message, additionalFields) {
    if (this.silence) return;
    this._moveMsgObject("fatal", message, additionalFields);
};

ServiceLogger.prototype.trace = function(message) {
    this._trace(message);
};

ServiceLogger.prototype.debug = function(message) {
    this._debug(message);
};

ServiceLogger.prototype.info = function(message) {
    this._info(message);
};

ServiceLogger.prototype.warn = function(message) {
    this._warn(message);
};

ServiceLogger.prototype.error = function(message) {
    this._error(message);
};

ServiceLogger.prototype.fatal = function(message) {
    this._fatal(message);
};

ServiceLogger.prototype._moveMsgObject = function(level, message, additionalFields = {}){

    // identify if dealing with an object or string message
    // move an object to the msg_json field that can be index by ELK
    // do nothing if dealing with a string
    // it is important to run this step before the message touches bunyan
    if(typeof message === "object"){
        message = {
            msg_json: message
        };

        Object.assign(message, additionalFields);
        return this.LOG[level](message);
    }

    return this.LOG[level](additionalFields, message);
};

ServiceLogger.prototype.raw = function(messageObject, support){

    if(typeof messageObject !== "object"){
        throw new Error("Logger.raw(obj) must be called with an object.");
    }

    if (this.silence) return;

    support = support || false;

    this._streams.forEach(function(stream){
        if(stream && stream.stream){
            stream.stream.write(messageObject, support ?
                RawStream.OVERWRITE_MODES.ADAPT :
                RawStream.OVERWRITE_MODES.NONE);
        }
    });
};

module.exports = ServiceLogger;
