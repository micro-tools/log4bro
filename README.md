# log4bro (nodejs logger)

- log4bro makes it hassle free to have compliant microservice log behaviour
- just require & init and log via global variable in a few seconds
- you can run in production mode to automatically switch log-levels
- you can run in dockerMode to stop logfile writing and change output to json fields
- you can attach some extra fields to json logs so that they are also loved by your ELK stack and your sysops
- node + docker + log4bro = happy you, happy ELK stack and happy sysops

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

```
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
    "varKey": "JLOG"
};

var logger2 = new log4bro(options2);

JLOG.trace(msg);
JLOG.debug(msg);
JLOG.info(msg);
JLOG.warn(msg);
JLOG.error(msg);
JLOG.fatal(msg);

```

- enjoy.. need help? contact me.. @krystianity or on twitter: @silentleave
- author: Christian Fröhlingsdorf, <chris@5cf.de>