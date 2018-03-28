"use strict";

const fs = require("graceful-fs");
const chalk = require("chalk");
const os = require("os");

const OVERWRITE_MODES = {
    NONE: "none",
    ALTER: "alter",
    ADAPT: "adapt"
};

class LoggerRawStream {
    /***
     * Stream class that enables bunyan to write custom fields to the log
     * e.g. switching time to @timestamp
     * will either write to process.stdout or logfile (depending on a given logFile)
     * @constructor
     */
    constructor(logFile, logFieldOptions, dockerMode) {

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

        this.dockerMode = dockerMode;
        this.hostName = os.hostname();
        this.pid = process.pid;
        this.serviceColor = process.env.SERVICE_COLOR;
    }

    /**
     * (stream) write method, called by bunyan
     * @param rec
     * @param overwriteMode
     */
    write(rec, overwriteMode) {

        if (typeof rec !== "object") {
            console.log("[log4bro] error: raw stream got a non-object record: %j", rec);
            return;
        }

        overwriteMode = overwriteMode || OVERWRITE_MODES.ALTER;

        switch(overwriteMode){

            case OVERWRITE_MODES.NONE:
                //none..
                break;

            case OVERWRITE_MODES.ADAPT:
                try {
                    rec = this.adaptLogFields(rec);
                } catch(e){
                    process.stdout.write("An exception occured during log field adaption: " +
                        e.message + ", for message: " + JSON.stringify(rec));
                    return;
                }
                break;

            case OVERWRITE_MODES.ALTER:
            default:
                try {
                    rec = this.alterLogFields(rec);
                } catch(e){
                    process.stdout.write("An exception occured during log field alteration: " +
                        e.message + ", for message: " + JSON.stringify(rec));
                    return;
                }
                break;
        }

        this.dockerMode ? this.jsonConsoleOutput(rec) : this.consoleOutput(rec);

        if(this.logStream){
            this.buffer.push(JSON.stringify(rec));
            rec = null;
            this.checkAndFlushBuffer();
        }
    }

    /**
     * alter method were log objects are re-mapped (actually re maps bunyan log output)
     * @returns {*}
     * @param log
     */
    alterLogFields(log) {

        //log will never be a string since it is coming from bunyan => object

        // remove bunyan fields

        if(log.time){
            delete log.time;
        }

        if(log.hostname){
            delete log.hostname;
        }

        if(typeof log.v !== "undefined"){
            delete log.v;
        }

        if(log.name){
            delete log.name;
        }

        // alter bunyan fields

        //level -> loglevel_value(int) + loglevel(string)
        if(log.level !== null){
            log.loglevel = LoggerRawStream.levelToName(log.level);
            log.loglevel_value = log.level;
            delete log.level;
        }

        // alter message payload (make sure only one of them exist)

        const jmsg = LoggerRawStream._isJsonString(log.msg);
        if(typeof jmsg === "object" && jmsg !== null){
            log.msg_json = jmsg;
            delete log.msg;
        }

        // set static log field keys

        if(this.logFieldKeys){
            for(let i = 0; i < this.logFieldKeys.length; i++){
                log[this.logFieldKeys[i]] = this.logFieldOptions[this.logFieldKeys[i]];
            }
        }

        // ensure minimum validity of log object

        return this.adaptLogFields(log);
    }

    /**
     * maps any (plain) object
     * @param log
     */
    adaptLogFields(log) {

        if(!log["@timestamp"]){
            log["@timestamp"] = new Date().toISOString();
        }

        if(!log["host"]){
            log.host = this.hostName;
        }

        if(!log.pid){
            log.pid = this.pid;
        }

        if(!log.loglevel){
            log.loglevel = "INFO";
        }

        if(!log.loglevel_value){
            log.loglevel_value = 30;
        }

        if(!log.log_type){
            log.log_type = "application";
        }

        if(!log.application_type){
            log.application_type = "service";
        }

        if(!log.service && this.logFieldOptions && this.logFieldOptions.service){
            log.service = this.logFieldOptions.service;
        }

        if(!log.current_color){
            log.current_color = this.serviceColor;
        }

        if(typeof log.msg === "undefined" && !log.msg_json){
            log.msg = "[log4bro] empty.";
        }

        if(typeof log.msg !== "undefined" && log.msg_json){
            delete log.msg;
        }

        return log;
    }

    /**
     * parses json if possible
     */
    static _isJsonString(str) {
        let obj = null;
        try {
            obj = JSON.parse(str);
        } catch (e) {
            //empty
        }
        return obj;
    }

    /**
     * writes a text console output if the logstream is not set
     */
    consoleOutput(obj) {

        if (!this.logStream) {
            let msg = LoggerRawStream.levelToName(obj.level ? obj.level : obj.loglevel_value)
                + " @ " + obj["@timestamp"] + " : " + (obj.msg ? obj.msg : JSON.stringify(obj.msg_json)) + "\n";
            msg = LoggerRawStream.levelToColorWrap(msg, obj.level ? obj.level : obj.loglevel_value);
            this.outStream.write(msg);
            msg = null;
        }
    }

    /**
     * writes a json console output if the logstream is not set
     */
    jsonConsoleOutput(obj) {

        if (!this.logStream) {
            let msg = LoggerRawStream.levelToColorWrap(JSON.stringify(obj), obj.level ? obj.level : obj.loglevel_value) + "\n";
            this.outStream.write(msg);
            msg = null;
        }
    }

    /**
     * turns log-level int-value into a read-able string
     * @param num
     * @returns {*}
     */
    static levelToName(num) {
        switch (num){
            case 10: return "TRACE";
            case 20: return "DEBUG";
            case 30: return "INFO";
            case 40: return "WARN";
            case 50: return "ERROR";
            case 60: return "FATAL";
            default: return "UNKNOWN";
        }
    }

    /**
     * turns a string into a colored string, depending on the log-level
     */
    static levelToColorWrap(str, level) {
        switch (level){
            case 10: return chalk.white(str);
            case 20: return chalk.cyan(str);
            case 30: return chalk.green(str);
            case 40: return chalk.yellow(str);
            case 50: return chalk.red(str);
            case 60: return chalk.red(str);
            default: return chalk.blue(str);
        }
    }

    /**
     * checks if the buffer has reached its flushing point, also takes care of the buffer timeout
     */
    checkAndFlushBuffer() {

        if (!this.logStream || !this.buffer.length) {
            return; //will do nothing
        }

        if (this.buffer.length >= this.bufferFlushSize) {
            return this.processBuffer(); //will end with a buffer being send to disk
        }

        clearTimeout(this._timeout); //buffer limit not reached, reset a timer to process buffer after timeout, if no more logs are sent

        const self = this;
        this._timeout = setTimeout(function(){ self.processBuffer(); }, this.bufferTimeout);
    }

    /**
     * writes buffer to file stream
     */
    processBuffer() {

        clearTimeout(this._timeout);

        const content = this.buffer.slice();
        this.buffer = [];

        for (let i = 0; i < content.length; i++) {
            this.logStream.write(content[i] + "\n");
        }
    }
}

LoggerRawStream.OVERWRITE_MODES = OVERWRITE_MODES;

module.exports = LoggerRawStream;
