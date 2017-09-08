"use strict";

const morgan = require("morgan");
const uuid = require("uuid");
const os = require("os");

const CUSTOMER_UUID = "customer-uuid";
const AUTH_INFO_USER_ID = "auth-info-user-id";

class ExpressMiddlewares {

    static accessLogMiddleware(serviceName, dockerMode, opts) {

        serviceName = serviceName || "unknown";
        const hostName = os.hostname();
        const serviceColor = process.env.SERVICE_COLOR || "unknown";
        const errorHandler = (request, response) => "error";
        let optKeys = [];
        let optKeysString = '';

        // Check for additional access logs
        if (opts && typeof opts === 'object') {
          Object.keys(opts).forEach((key) => {
            try {
              morgan.token(key, typeof opts[key] === 'function' ? opts[key] : errorHandler);
            }
            catch(err) {
              morgan.token(key, errorHandler);
            }
            optKeys.push(`\"${key}\": \":${key}\"`);
          });
          optKeysString = optKeys.length > 0 ? `${optKeys.join()},` : optKeysString;
        }

        morgan.token("host_name", function getHostName(request, response) {
            return hostName;
        });

        morgan.token("service_name", function getHostName(request, response) {
            return serviceName;
        });

        morgan.token("uri", function getUri(request, response) {
            try {
                return request._parsedUrl.pathname;
            } catch (e) {
                return "error";
            }
        });

        morgan.token("query_string", function getQueryString(request) {
            try {
                return request._parsedUrl.query;
            } catch (e) {
                return "error";
            }
        });

        morgan.token("protocol", function getProtocol(request, response) {
            try {
                return request.secure ? "HTTPS" : "HTTP";
            } catch (e) {
                return "error";
            }
        });

        morgan.token("server_name", function getServerName(request, response) {
            try {
                return request.headers.host ? request.headers.host : "unknown";
            } catch (e) {
                return "error";
            }
        });

        morgan.token("service_color", function getServiceColor(request, response) {
            return serviceColor;
        });

        morgan.token("remote_client_id", function getRemoteClientId(request, response) {

            let rcId = "";

            try {
                rcId = request.headers.customeruuid;

                if (request.headers[CUSTOMER_UUID]) {
                    rcId = request.headers[CUSTOMER_UUID];
                }

                if (request.headers[AUTH_INFO_USER_ID]) {
                    rcId = request.headers[AUTH_INFO_USER_ID];
                }

                if (!rcId) {
                    rcId = "unknown";
                }

            } catch (e) {
                rcId = "error";
            }

            return rcId;
        });

        morgan.token("bytes_received", function getBytesReceived(request, response) {
            try {

                if (typeof request.body === "string") {
                    return Buffer.byteLength(request.body, "utf-8").toString();
                }

                return "0";

            } catch (e) {
                return "error";
            }
        });

        return morgan(
            "{ \"@timestamp\": \":date[iso]\", \"host\": \":host_name\", \"loglevel\": \"INFO\"," +
            " \"correlation-id\": \":req[correlation-id]\", \"application_type\": \"service\", \"log_type\": \"access\"," +
            " \"service\": \":service_name\", \"remote_address\": \":remote-addr\", \"status\": \":status\"," +
            " \"request_method\": \":method\", \"uri\": \":uri\", \"query_string\": \":query_string\"," +
            " \"response_time\": \":response-time\", \"protocol\": \":protocol\", \"server_name\": \":server_name\"," +
            " \"current_color\": \":service_color\", \"remote_client_id\": \":remote_client_id\", " +
            optKeysString + " \"bytes_received\": \":bytes_received\" }",
            {});
    }

    accessLogMiddlewareFile(filePath, dockerMode) {

        morgan.token("uri", function getUri(request, response) {
            return request._parsedUrl.pathname;
        });

        morgan.token("query_string", function getQueryString(request) {
            return request._parsedUrl.query;
        });

        const accessLogStream = fs.createWriteStream(filePath, {flags: 'a'});
        const hostName = os.hostname();

        return morgan(
            "{ \"@timestamp\": \":date[iso]\", \"host\": \"" + hostName + "\", \"loglevel\": \"INFO\", \"correlationId\": \":req[correlation-id]\", \"application_type\": \"service\", \"log_type\": \"access\", \"remote_address\": \":remote-addr\", \"status\": \":status\", \"request_method\": \":method\", \"uri\": \":uri\", \"query_string\": \":query_string\", \"response_time\": \":response-time\" }",
            {stream: accessLogStream});
    }
};

module.exports = ExpressMiddlewares;
