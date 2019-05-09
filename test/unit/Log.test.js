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
            productionMode: true,
            logDir: "logs",
            silence: false,
            loggerName: "dev",
            dockerMode: true,
            varKey: "TLOG",
            logFieldOptions: {
                log_type: "application",
                application_type: "service",
                service: "test-service"
            },
            serviceName: "test-service",
            level: "DEBUG"
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

    describe("Logging of error objects", () => {
        const cor_value = "i-am-a-correlation-id";
        const errorMessage = "Error message";
        const additionalText = "this is an additional property";
        const additionalProperty = "additionalPropertyOnError";

        it("should log error objects", () => {
            let captured = "";
            new Logger({
                productionMode: true,
                logDir: "logs",
                silence: false,
                loggerName: "dev",
                dockerMode: true,
                varKey: "ELOG",
                logFieldOptions: {
                    log_type: "application",
                    application_type: "service",
                    service: "test-service"
                },
                serviceName: "test-service",
                level: "DEBUG"
            });

            const testLogger = ELOG.createChild({"correlation-id": cor_value});
            const error = new Error(errorMessage);
            error[additionalProperty] = additionalText;

            const unhook_intercept = intercept(txt => captured += txt);
            testLogger.error(error);

            unhook_intercept();

            assert.ok(captured.includes(`"${additionalProperty}":"${additionalText}"`), "includes the additional property");
            assert.ok(captured.includes(`"stack":"Error: ${errorMessage}\\n`), "Includes the stacktrace");
            assert.ok(captured.includes(`"msg":"${errorMessage}"`), "Includes the error message as log msg property");
            assert.ok(captured.includes(`"correlation-id":"${cor_value}"`), "Includes the error message as log msg property");
        });
        it("should log extended error objects", () => {
            let captured = "";
            new Logger({
                productionMode: true,
                logDir: "logs",
                silence: false,
                loggerName: "dev",
                dockerMode: true,
                varKey: "ELOG",
                logFieldOptions: {
                    log_type: "application",
                    application_type: "service",
                    service: "test-service"
                },
                serviceName: "test-service",
                level: "DEBUG"
            });

            const testLogger = ELOG.createChild({"correlation-id": cor_value});
            class ExtError extends Error {
                constructor(message) {
                    super(message);
                    this[additionalProperty] = additionalText;
                }
            }
            const error = new ExtError(errorMessage);

            const unhook_intercept = intercept(txt => captured += txt);
            testLogger.error(error);

            unhook_intercept();

            assert.ok(captured.includes(`"${additionalProperty}":"${additionalText}"`), "includes the additional property");
            assert.ok(captured.includes(`"stack":"Error: ${errorMessage}\\n`), "Includes the stacktrace");
            assert.ok(captured.includes(`"msg":"${errorMessage}"`), "Includes the error message as log msg property");
            assert.ok(captured.includes(`"correlation-id":"${cor_value}"`), "Includes the error message as log msg property");
        });
    });
});