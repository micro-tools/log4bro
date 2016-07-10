var express = require("express");
var log4bro = require("./../../index.js");

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
        res.send("yeah bro!");
    }, 1500);
});

var port = 1337;
app.listen(port, function(){
    MLOG.info("listening at " + port);
});