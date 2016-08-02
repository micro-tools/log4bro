# log4bro

- log4bro makes it hassle free to have compliant microservice log behaviour
- just require & init and log via global variable in a few seconds
- you can run in production mode to automatically switch log-levels
- you can run in dockerMode to stop logfile writing and change output to json fields
- you can attach some extra fields to json logs so that they are also loved by your ELK stack and your sysops
- node + docker + log4bro = happy you, happy ELK stack and happy sysops

|   |
|---|
|   |

- comes batteries included for express.js users (check ./src/examples/express_example.js)
- auto. access log in ELK format (cout or file)
- auto. correlation-id header management and logging

# simple example

```javascript

//somewhere in your init script/class

const log4bro = require("log4bro");

const options = {
  "productionMode": true, //switches loglevel between DEBUG and WARN
  "logDir": "logs", //relative directory to write log file to
  "silence": false, //silences logger
  "loggerName": "dev", //ignore
  "dockerMode": true, //disables output to logfile
  "varKey": "LOG" //name of global variable
};

const logger = new log4bro(options);

//in any other script/class
//- logger becomes a global object

LOG.trace("bla");
LOG.debug("bla");
LOG.info("bla");
LOG.warn("bla");
LOG.error("bla");
LOG.fatal("bla");

//thats all there is to it..
```

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

# auto express.js access log + correlation-id logging

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

//run namespaceing middleware to attach or forward correlation-id on incoming http-requests
//they will be automatically logged on all logs that occure during that request in your service
//expected header is: "correlation-id"
//if header is missing, it will be set using a generated uuid (v4), will cause debug logs
logger.applyMiddlewareCorrelationId(app);
```

- enjoy.. need help? contact me.. @krystianity or on twitter: @silentleave
- author: Christian Fröhlingsdorf, <chris@5cf.de>
- license: MIT