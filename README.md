# log4bro

[![Build Status](https://travis-ci.org/micro-tools/log4bro.svg?branch=master)](https://travis-ci.org/micro-tools/log4bro)

- log4bro makes it hassle free to have compliant microservice ELK stack log behaviour
- just require & init and log via global variable in a few seconds
- you can run in production mode to automatically switch log-levels
- you can run in dockerMode to stop logfile writing and change output to json fields
- you can attach some extra fields to json logs so that they are also loved by your ELK stack and your sysops
- node + docker + log4bro = happy you, happy ELK stack and happy sysops
- comes batteries included for express.js users (check /examples/express_example.js)
- auto. access log in ELK format (cout or file)
- switch log-level dynamically example: `global.LOG.changeLogLevel("INFO");`

# simple example

```es6
const Logger = require("log4bro");

const options = {
  productionMode: true, //switches loglevel between DEBUG and WARN
  logDir: "logs", //relative directory to write log file to
  silence: false, //silences logger
  loggerName: "dev", //ignore
  dockerMode: true, //disables output to logfile
  varKey: "LOG" //name of global variable
};

const logger = new Logger(options);

LOG.trace("bla");
LOG.debug("bla");
LOG.info("bla");
LOG.warn("bla");
LOG.error("bla");
LOG.fatal("bla");
```

[Read More Here](docs/more.md)