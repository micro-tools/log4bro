var fs = require("fs");
var bunyan = require("bunyan");
var ns = require('continuation-local-storage');

var RawStream = require("./LoggerRawStream.js");
var Middlewares = require("./ExpressMiddlewares.js");

const NAMESPACE = "log4bro.ns";
const CORRELATION_HEADER = "correlation-id";

function ServiceLogger(loggerName, silence, logDir, productionMode, dockerMode, varKey, logFieldOptions) {

    if(typeof loggerName === "object" && arguments.length === 1){
        productionMode = loggerName.productionMode;
        logDir = loggerName.logDir;
        silence = loggerName.silence;
        dockerMode = loggerName.dockerMode;
        varKey = loggerName.varKey;
        logFieldOptions = loggerName.logFieldOptions;

        loggerName = loggerName.name; //last
    }

    this.varKey = varKey || "LOG";
    this.dockerMode = dockerMode || false;
    this.logFieldOptions = logFieldOptions || null;
    this.silence = silence || false;
    this.logDir = logDir || "logs";

    if (!loggerName && !productionMode) {
        this.loggerName = loggerName || "dev";
    } else {
        this.loggerName = loggerName || "prod";
    }

    if(productionMode){
        console.log("[log4bro] Logger is in production mode.");
    } else {
        console.log("[log4bro] Logger is in development mode.");
    }

    var streams = [
        {
            "type": "raw",
            "level": productionMode ? "WARN" : "TRACE",
            "stream": new RawStream(null, this.logFieldOptions, this.dockerMode) //will only write to console/stdout
        }
    ];

    if(!this.dockerMode){

        console.log("[log4bro] Logger is not in docker mode.");
        this.createLoggingDir();

        streams.push({
            "type": "raw",
            "level": productionMode ? "WARN" : "INFO",
            "stream": new RawStream(this.logDir + "/service-log.json", this.logFieldOptions) //will only write to logfile
        });
    } else {
        console.log("[log4bro] Logger is in docker mode.");
    }

    this.LOG = bunyan.createLogger({
        "name": this.loggerName,
        "streams": streams,
        "src": false
    });

    this.setGlobal();
}

ServiceLogger.prototype.createLoggingDir = function() {

    if (!fs.existsSync(this.logDir)) {
        console.log("[log4bro] Logs folder does not exists creating " + this.logDir + " make sure to set path in blammo.xml.");
        fs.mkdirSync(this.logDir);
        return;
    }

    console.log("[log4bro] Logs folder exists, clearing " + this.logDir);

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

    expressApp.use(Middlewares.accessLogMiddleware());
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

ServiceLogger.prototype.applyMiddlewareCorrelationId = function(expressApp){

    if(!expressApp || typeof expressApp !== "function"){
        throw new Error("[log4bro] ExpressApp is null or not an object, make sure you pass an instance of express() to applyMiddleware.");
    }

    expressApp.use(Middlewares.correlationIdMiddleware(NAMESPACE, CORRELATION_HEADER, this.varKey));
    return expressApp;
};

ServiceLogger.prototype.setGlobal = function() {
    global[this.varKey] = this;
};

ServiceLogger.prototype.trace = function(message) {
    if (this.silence) return;
    this.LOG.trace(this.enhance(message));
};

ServiceLogger.prototype.debug = function(message) {
    if (this.silence) return;
    this.LOG.debug(this.enhance(message));
};

ServiceLogger.prototype.info = function(message) {
    if (this.silence) return;
    this.LOG.info(this.enhance(message));
};

ServiceLogger.prototype.warn = function(message) {
    if (this.silence) return;
    this.LOG.warn(this.enhance(message));
};

ServiceLogger.prototype.error = function(message) {
    if (this.silence) return;
    this.LOG.error(this.enhance(message));
};

ServiceLogger.prototype.fatal = function(message) {
    if (this.silence) return;
    this.LOG.fatal(this.enhance(message));
};

ServiceLogger.prototype.enhance = function(message) {
    /* enhance */

    //TODO hmm..
    if(typeof message === "object"){

        if(Object.keys(message).length <= 15){
            message = JSON.stringify(message);
        } else {
            message = "[Object object, with more than 15 keys.]";
        }
    }

    var namespace = ns.getNamespace(NAMESPACE);
    if (namespace) {
        var correlationId = namespace.get(CORRELATION_HEADER);
        if (correlationId) {
            return "correlationId: " + correlationId + " " + message;
        }
    }

    return message;
};

module.exports = ServiceLogger;