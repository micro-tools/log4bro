var log4bro = require("../index.js");

new log4bro({
    "productionMode": true,
    "logDir": "logs",
    "silence": false,
    "loggerName": "dev",
    "dockerMode": true,
    "caller": true,
    "varKey": "TLOG",
    "logFieldOptions": {
        "log_type": "application",
        "application_type": "service",
        "service": "test-service"
    },
    "serviceName": "test-service",
    "level": "DEBUG"
});

const testLogger = TLOG.createChild({"correlation-id": "i-am-a-correlation-id"});

console.log();

testLogger.warn({ an: "object"});
testLogger.warn("I am an empty string");

console.log();

const emptyFieldsLogger = TLOG.createChild();

emptyFieldsLogger.info({ an: "object" });
emptyFieldsLogger.info("I am an empty string");

console.log();

TLOG.debug({ an: "object"});
TLOG.error("I am an empty string");
