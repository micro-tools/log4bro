var uuid = require("uuid");
var express = require("express");
var request = require("request");
var log4bro = require("../index.js");

var options = {
    "production": true,
    "logDir": "logs",
    "skipEnhance": true,
    "namespace": "",
    "silence": false,
    "loggerName": "dev",
    "docker": true,
    "varKey": "MLOG",
    "level": "DEBUG",
    "serviceName": "cool-service"
};

var logger = new log4bro(options);
var app = express();

//#log an elk formatted access log to cout
logger.applyMiddlewareAccessLog(app, {
    rjm: (req, res) => {
        return "hi-test";
    }
});

//#log an elk formatted access log to a file
//log4bro.applyMiddlewareAccessLogFile(app, "./access_log.json");

app.get("/", function (req, res) {
    if (!req.headers["correlation-id"]) {
        req.headers["correlation-id"] = uuid.v4();
    }
    const reqLogger = MLOG.createChild({"correlation-id" : req.headers["correlation-id"]})
    setTimeout(function(){
        reqLogger.debug("debug - wuuut");
        reqLogger.info("info - yeah broooo..");
        reqLogger.error("error - this should not be in msg_json");
        res.json({ "_correlationId": req.headers["correlation-id"] });
    }, 500);
});

var port = 1337;
app.listen(port, function(){
    MLOG.info("listening at " + port);

    request({ "url": "http://localhost:" + port + "/" }, function(err, response, body){

        MLOG.warn(body);
        MLOG.changeLogLevel("INFO");

        request({ "url": "http://localhost:" + port + "/" }, function(err, response, body){

            MLOG.changeLogLevel("DEBUG");

            request({ "url": "http://localhost:" + port + "/" }, function(err, response, body){
                process.exit(0);
            });
        });
    });
});
