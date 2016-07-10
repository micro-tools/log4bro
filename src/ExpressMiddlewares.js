var morgan = require("morgan");
var uuid = require("uuid");
var ns = require('continuation-local-storage');

const NAMESPACE = "log4bro.ns";
const CORRELATION_HEADER = "correlation-id";

var ExpressMiddlewares = {}; //static

ExpressMiddlewares.accessLogMiddleware = function () {

    morgan.token("uri", function getUri(request, response) {
        return request._parsedUrl.pathname;
    });

    morgan.token("query_string", function getQueryString(request) {
        return request._parsedUrl.query;
    });

    return morgan(
        "{ \"@timestamp\": \":date[iso]\",  \"loglevel\": \"INFO\", \"correlationId\": \":req[correlation-id]\", \"service\": \"mobile-gateway\", \"application_type\": \"service\", \"log_type\": \"access\", \"remote_address\": \":remote-addr\", \"status\": \":status\", \"request_method\": \":method\", \"uri\": \":uri\", \"query_string\": \":query_string\", \"response_time\": \":response-time\" }",
        {});
};

ExpressMiddlewares.accessLogMiddlewareFile = function (filePath) {

    morgan.token("uri", function getUri(request, response) {
        return request._parsedUrl.pathname;
    });

    morgan.token("query_string", function getQueryString(request) {
        return request._parsedUrl.query;
    });

    var accessLogStream = fs.createWriteStream(filePath, {flags: 'a'});

    return morgan(
        "{ \"@timestamp\": \":date[iso]\",  \"loglevel\": \"INFO\", \"correlationId\": \":req[correlation-id]\", \"service\": \"mobile-gateway\", \"application_type\": \"service\", \"log_type\": \"access\", \"remote_address\": \":remote-addr\", \"status\": \":status\", \"request_method\": \":method\", \"uri\": \":uri\", \"query_string\": \":query_string\", \"response_time\": \":response-time\" }",
        {stream: accessLogStream});
};

ExpressMiddlewares.correlationIdMiddleware = function(_namespace, _header, _logval) {

    var space = ns.getNamespace(_namespace);
    if(!space) {
        ns.createNamespace(_namespace);
    }

    _namespace = _namespace || NAMESPACE;
    _header = _header || CORRELATION_HEADER;
    _logval = _logval || "LOG";

    return function(request, response, next) {

        var namespace = ns.getNamespace(_namespace);
        namespace.bindEmitter(request);
        namespace.bindEmitter(response);

        var correlationID = request.headers[CORRELATION_HEADER];

        if (!correlationID || correlationID === "") {
            correlationID = uuid.v4();
            request.headers[_header] = correlationID;

            var log = global[_logval];
            if(log && typeof log === "object" && typeof log.debug === "function") {
                log.debug("[log4bro] Setting new correlationID [" + correlationID + "] for req-url: " + request.url);
            }
        }

        namespace.run(function () {
            namespace.set(CORRELATION_HEADER, correlationID);
            next();
        });
    };
};

module.exports = ExpressMiddlewares;