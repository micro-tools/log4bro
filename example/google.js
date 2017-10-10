var log4bro = require("../index.js");

var options = {
    "productionMode": false,
    "skipEnhance": true,
    "namespace": "",
    "silence": false,
    "loggerName": "dev",
    "level": "DEBUG",
    "dockerMode": false,
    "varKey": "MLOG",
    "stackdriver": {
      "scope": "both",
      "projectId": "sound-sanctuary-173709",
      // Please provide relevant cred.json. Please generate from link below
      // https://cloud.google.com/storage/docs/authentication#service_accounts
      "keyFilename": "./cred.json"
    }
};

var logger = new log4bro(options);

var msg = "ich mache mir sorgen, ob der logger denn noch funktioniert.";

MLOG.debug(msg);
MLOG.info(msg);
MLOG.warn(msg);
MLOG.error(msg);
MLOG.fatal(msg);

MLOG.info(options);

var goptions = {
    "productionMode": false,
    "skipEnhance": true,
    "namespace": "",
    "silence": false,
    "level": "WARN",
    "loggerName": "dev",
    "dockerMode": false,
    "varKey": "GLOG",
    "stackdriver": {
      "scope": "only",
      "projectId": "sound-sanctuary-173709",
      // Please provide relevant cred.json. Please generate from link below
      // https://cloud.google.com/storage/docs/authentication#service_accounts
      "keyFilename": "./cred.json"
    }
};

var glogger = new log4bro(goptions);

var gmsg = "You shouldn't read this from Console.";

GLOG.debug(gmsg);
GLOG.info(gmsg);
GLOG.warn(gmsg);
GLOG.error(gmsg);
GLOG.fatal(gmsg);

GLOG.info(goptions);
