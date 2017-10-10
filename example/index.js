var log4bro = require("../index.js");

var options = {
    "productionMode": false,
    "logDir": "logs",
    "skipEnhance": true,
    "namespace": "",
    "silence": false,
    "loggerName": "dev",
    "dockerMode": false,
    "varKey": "MLOG"
};

var logger = new log4bro(options);

var msg = "ich mache mir sorgen, ob der logger denn noch funktioniert.";

MLOG.trace(msg);
MLOG.debug(msg);
MLOG.info(msg);
MLOG.warn(msg);
MLOG.error(msg);
MLOG.fatal(msg);

MLOG.info(options);

console.log("");
/* json style */

var options2 = {
    "productionMode": true,
    "logDir": "logs",
    "skipEnhance": true,
    "namespace": "",
    "silence": false,
    "loggerName": "dev",
    "dockerMode": true,
    "caller": true,
    "varKey": "JLOG",
    "logFieldOptions": {
        "log_type": "application",
        "application_type": "service",
        "service": "bro-service"
    }
};

var logger2 = new log4bro(options2);

JLOG.trace(msg);
JLOG.debug(msg);
JLOG.info(msg);
JLOG.warn(msg);
JLOG.error(msg);
JLOG.fatal(msg);

JLOG.error(options2);

JLOG.raw({
    gulf: "bulf"
});

JLOG.raw({
    gulf: "bulf",
    service: "wurst-service"
}, true);
