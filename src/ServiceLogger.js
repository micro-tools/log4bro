var fs = require("fs");
var bunyan = require("bunyan");
var RawStream = require("./LoggerRawStream.js");

function ServiceLogger(loggerName, silence, logDir, productionMode, dockerMode) {

    if (ServiceLogger.instance) return ServiceLogger.instance;

    if(typeof loggerName === "object" && arguments.length === 1){
        productionMode = loggerName.productionMode;
        logDir = loggerName.logDir;
        silence = loggerName.silence;
        dockerMode = loggerName.dockerMode;
        loggerName = loggerName.name; //last
    }

    this.dockerMode = dockerMode || false;

    if (!loggerName && !productionMode) {
        loggerName = loggerName || "dev";
    } else {
        loggerName = loggerName || "prod";
    }

    if(productionMode){
        console.log("[ServiceLogger] Logger is in production mode.");
    } else {
        console.log("[ServiceLogger] Logger is in development mode.");
    }

    this.silence = silence || false;
    if (this.silence) {
        //console.log("Any kind of logger was silenced!");
        //console.log = function() {};
        //console.dir = function() {};
    }

    this.skipEnhance = skipEnhance || true;
    this.logDir = logDir || "logs";

    var streams = [
        {
            "type": "raw",
            "level": productionMode ? "WARN" : "DEBUG",
            "stream": new RawStream(null) //will only write to console/stdout
        }
    ];

    if(!dockerMode){
        streams.push({
            "type": "raw",
            "level": productionMode ? "WARN" : "INFO",
            "stream": new RawStream(this.logDir + "/service-log.json") //will only write to logfile
        });
    } else {
        console.log("[ServiceLogger] Logger is in docker mode.");
    }

    this.createLoggingDir();
    this.LOG = bunyan.createLogger({
        "name": loggerName,
        "streams": streams,
        "src": false
    });

    this.setGlobal();

    ServiceLogger.instance = this;
    return this;
}

ServiceLogger.prototype.createLoggingDir = function() {

    if (!fs.existsSync(this.logDir)) {
        console.log("[ServiceLogger] Logs folder does not exists creating " + this.logDir + " make sure to set path in blammo.xml.");
        fs.mkdirSync(this.logDir);
        return;
    }

    console.log("[ServiceLogger] Logs folder exists, clearing " + this.logDir);

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

ServiceLogger.prototype.getLogger = function() {
    return this;
};

ServiceLogger.prototype.setGlobal = function() {
    global.LOG = this;
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

ServiceLogger.prototype.enhance = function(message) {
    /* enhance */
    return message;
};

module.exports = ServiceLogger;