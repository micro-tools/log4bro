var express = require("express");
var request = require("request");
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
    "logLevel": "DEBUG",
    "serviceName": "cool-service"
};

var logger = new log4bro(options);
var app = express();

//#run namespaceing middleware to attach or forward correlation-id on incoming http-requests
//#they will be automatically logged on all logs that occure during that request in your service
//#expected header is: "correlation-id"
//#if header is missing, it will be set using a generated uuid (v4), will cause debug logs
logger.applyMiddlewareCorrelationId(app);

//#log an elk formatted access log to cout
logger.applyMiddlewareAccessLog(app);

//#log an elk formatted access log to a file
//log4bro.applyMiddlewareAccessLogFile(app, "./access_log.json");

app.get("/", function (req, res) {
    setTimeout(function(){
        MLOG.info("yeah broooo..");
        MLOG.error("this should not be in msg_json");
        res.json({ "_correlationId": req.headers["correlation-id"] });
    }, 1500);
});

var port = 1337;
app.listen(port, function(){
    MLOG.info("listening at " + port);

    request({ "url": "http://localhost:" + port + "/" }, function(err, response, body){
        MLOG.warn(body);
    });
});