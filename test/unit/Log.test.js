"use strict";

const assert = require("assert");
const intercept = require("intercept-stdout");
const Logger = require("./../../index.js");

describe("Log UNIT", function() {

    it("should be able to log correctly", function(){

        let captured = "";
        const unhook_intercept = intercept(txt => {
            captured += txt;
        });

        new Logger({
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

        const cor_value = "i-am-a-correlation-id";
        const testLogger = TLOG.createChild({"correlation-id": cor_value});
        testLogger.info({ an: "object"});
        testLogger.warn("I am an empty string");

        unhook_intercept();

        assert.ok(captured.length);
        assert.ok(captured.includes(cor_value));
        assert.equal(captured.split("\n").length, 4);
    });
});