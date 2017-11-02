"use strict";

const fs = require("fs");
const bunyan = require("bunyan");
let googleBunyan = null;

const RawStream = require("./LoggerRawStream.js");
const Middlewares = require("./ExpressMiddlewares.js");

const LOG_LEVELS = ["TRACE", "DEBUG", "INFO", "WARN", "ERROR", "FATAL"];

class ServiceLogger {
    constructor(loggerName, silence, logDir, productionMode, dockerMode, varKey, logFieldOptions, level, serviceName, caller, stackdriver) {

        if(typeof loggerName === "object" && arguments.length === 1){
            productionMode = loggerName.production || loggerName.productionMode; //support fallback
            logDir = loggerName.logDir;
            silence = loggerName.silence;
            dockerMode = loggerName.docker || loggerName.dockerMode; //support fallback
            varKey = loggerName.varKey;
            logFieldOptions = loggerName.logFieldOptions;
            level = loggerName.level || loggerName.logLevel; //support fallback to older key named "logLevel"
            serviceName = loggerName.serviceName;
            stackdriver = loggerName.stackdriver;
            caller = loggerName.caller;
            stackdriver = loggerName.stackdriver;

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
        this.stackdriver = stackdriver;
        this.caller = caller || false;

        this.skipDebug = this.silence || (this.productionMode &&
            !(this.logLevel === "TRACE" || this.logLevel === "DEBUG"));

        if (!loggerName && !this.productionMode) {
            this.loggerName = loggerName || "dev";
        } else {
            this.loggerName = loggerName || "prod";
        }

        this._streams = null;

        this.LOG = this._createLogger();

        let sdInitText = "";
        if (this.stackdriver) {

          // Not pretty, but the way to catch authentication error is rewriting google bunyan stream lib
          // Apparently they create a callback from native code which there's no error handling
          process.on('unhandledRejection', (reason, p) => {
            console.log('Unhandled Rejection at:', p, 'reason:', reason);
          });

          switch(this.stackdriver.scope) {

            case "only":
              // Make the logger streams to only Google Stackdriver
              this.LOG = this._createGoogleLogger();
              break;

            case "both":
              // Make the logger streams to both to default stream and Google Stackdriver
              this.GLOG = this._createGoogleLogger();
              break;

            default:
              // Return default stream when there's no scope is written
              // this.LOG is still the same
              this.stackdriver.scope = "default";
          }

          sdInitText =  ", stackdriver-log=" + Boolean(this.stackdriver) +
                        ", stream-scope=" + this.stackdriver.scope;

        }

        this.LOG.info("[log4bro] Logger is: in-prod=" + this.productionMode +
            sdInitText +
            ", in-docker:" + this.dockerMode +
            ", level=" + this.logLevel +
            ", skipDebug=" + this.skipDebug);

        this.setGlobal();
    }

    _createGoogleLogger() {

      let logger;

      try {

        if(!googleBunyan){
            googleBunyan = require("@google-cloud/logging-bunyan");
        }

        logger = bunyan.createLogger({
          "name": this.loggerName,
          "streams": [
            googleBunyan(
              Object.assign({}, this.stackdriver, {logName: this.loggerName})
            )
            .stream(this.logLevel)
          ],
          "src": false
        });

      } catch(e) {

        this.LOG.error("Unable to create Stackdriver Stream, switching to default. Reason:", e);
        logger = this._createLogger();
      }


      return logger;
    }

    _createLogger() {

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

    }

    createChild(defaultAdditionalFields = {}) {
        const self = this;
        defaultAdditionalFields.child = true;
        return {
            trace: (message, additionalFields) => self.trace(message, Object.assign({}, additionalFields, defaultAdditionalFields)),
            debug: (message, additionalFields) => self.debug(message, Object.assign({}, additionalFields, defaultAdditionalFields)),
            info: (message, additionalFields) => self.info(message, Object.assign({}, additionalFields, defaultAdditionalFields)),
            warn: (message, additionalFields) => self.warn(message, Object.assign({}, additionalFields, defaultAdditionalFields)),
            error: (message, additionalFields) => self.error(message, Object.assign({}, additionalFields, defaultAdditionalFields)),
            fatal: (message, additionalFields) => self.fatal(message, Object.assign({}, additionalFields, defaultAdditionalFields))
        }
    }

    changeLogLevel(level) {

        if(level && LOG_LEVELS.indexOf(level) === -1){
            this.LOG.error("[log4bro] level is not a supported logLevel: " + level + ", defaulting to INFO.");
            return;
        }

        this.skipDebug = !(level === "DEBUG" || level === "TRACE");

        this.LOG.info("[log4bro] changing loglevel from " + this.logLevel + " to " + level + ".");
        this.logLevel = level;
        this.LOG = this._createLogger();
    }

    createLoggingDir() {

        if (!fs.existsSync(this.logDir)) {
            //console.log("[log4bro] Logs folder does not exists creating " + this.logDir + " make sure to set path in blammo.xml.");
            fs.mkdirSync(this.logDir);
            return;
        }

        //console.log("[log4bro] Logs folder exists, clearing " + this.logDir);

        let files = null;
        try { files = fs.readdirSync(this.logDir); }
        catch (e) { return; }

        if (files.length > 0)
            for (let i = 0; i < files.length; i++) {
                const filePath = this.logDir + "/" + files[i];
                if (fs.statSync(filePath).isFile())
                    fs.unlinkSync(filePath);
                else
                    fs.rmDir(filePath);
            }
    }

    applyMiddlewareAccessLog(expressApp, opts) {

        if(!expressApp || typeof expressApp !== "function"){
            throw new Error("[log4bro] ExpressApp is null or not an object, make sure you pass an instance of express() to applyMiddleware.");
        }

        expressApp.use(Middlewares.accessLogMiddleware(this.serviceName, this.dockerMode, opts));
        return expressApp;
    }

    applyMiddlewareAccessLogFile(expressApp, logFilePath) {

        if(!expressApp || typeof expressApp !== "function"){
            throw new Error("[log4bro] ExpressApp is null or not an object, make sure you pass an instance of express() to applyMiddleware.");
        }

        if(!logFilePath){
            throw new Error("[log4bro] logFilePath is empty on applyMiddlewareAccessLogFile.");
        }

        expressApp.use(Middlewares.accessLogMiddlewareFile(logFilePath));
        return expressApp;
    }

    setGlobal() {
        global[this.varKey] = this;
    }

    trace(message, additionalFields) {
        if (this.skipDebug) return; //save memory & cpu
        this._moveMsgObject("trace", message, additionalFields);
    }

    debug(message, additionalFields) {
        if (this.skipDebug) return; //save memory & cpu
        this._moveMsgObject("debug", message, additionalFields);
    }

    info(message, additionalFields) {
        if (this.silence) return;
        this._moveMsgObject("info", message, additionalFields);
    }

    warn(message, additionalFields) {
        if (this.silence) return;
        this._moveMsgObject("warn", message, additionalFields);
    }

    error(message, additionalFields) {
        if (this.silence) return;
        this._moveMsgObject("error", message, additionalFields);
    }

    fatal(message, additionalFields) {
        if (this.silence) return;
        this._moveMsgObject("fatal", message, additionalFields);
    }

    _moveMsgObject(level, message, additionalFields = {}) {

        // identify if dealing with an object or string message
        // move an object to the msg_json field that can be index by ELK
        // do nothing if dealing with a string
        // it is important to run this step before the message touches bunyan

        const {child, wrapped} = additionalFields;

        if (this.caller) {
          try {
            const index = 3 + (child ? 1 : 0) + (wrapped ? 1: 0);
            additionalFields.caller = new Error().stack.split("\n")[index].trim();
          } catch(err) {
            additionalFields.caller = "error";
          }
        }

        child && delete additionalFields.child;
        wrapped && delete additionalFields.wrapped;

        if(typeof message === "object"){
            message = {
                msg_json: message
            };

            Object.assign(message, additionalFields);

            if (this.GLOG)
              this.GLOG[level](message);

            return this.LOG[level](message);
        }

        if (this.GLOG)
          this.GLOG[level](additionalFields, message);

        return this.LOG[level](additionalFields, message);
    }

    raw(messageObject, support) {

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
    }
}

module.exports = ServiceLogger;
