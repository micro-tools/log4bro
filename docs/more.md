# different example show text & json output
 - (just run npm start to run example locally)

```javascript
var log4bro = require("log4bro");

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
```

# auto express.js access log logging

```javascript
var express = require("express");
var log4bro = require("./../../index.js");

var options = {
    "productionMode": false,
    "logDir": "logs",
    "skipEnhance": true,
    "namespace": "",
    "silence": false,
    "loggerName": "dev",
    "dockerMode": true,
    "varKey": "MLOG",
    "level": "DEBUG",
    "serviceName": "cool-service"
};

var logger = new log4bro(options);
var app = express();

// log an elk formatted access log to cout
logger.applyMiddlewareAccessLog(app);

//log an elk formatted access log to a file
logger.applyMiddlewareAccessLogFile(app, "./access_log.json");
```