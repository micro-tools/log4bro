var log4bro = require("./../../index.js");
var ns = require("continuation-local-storage");

new log4bro({
    "productionMode": true,
    "logDir": "logs",
    "silence": false,
    "loggerName": "dev",
    "dockerMode": true,
    "varKey": "TLOG",
    "logFieldOptions": {
        "log_type": "application",
        "application_type": "service",
        "service": "test-service"
    },
    "serviceName": "test-service",
    "level": "DEBUG"
});

var nsp = "log4bro.ns";
var space = ns.getNamespace(nsp);
if(!space) {
    space = ns.createNamespace(nsp);
}

console.log();

space.run(function () {
    space.set("correlation-id", "i-am-a-correlation-id");
    TLOG.warn({ an: "object"});
    TLOG.warn("ich bin ein leerer string");
});

console.log();

TLOG.debug({ an: "object"});
TLOG.error("ich bin ein leerer string");