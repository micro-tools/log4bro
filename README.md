# log4bro (nodejs logger)
- the (only) one usable logger

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

- author: Christian Fröhlingsdorf, <chris@5cf.de>