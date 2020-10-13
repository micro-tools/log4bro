import bunyan = require("bunyan");
import { Application } from "express";
import { Options as MorganOptions } from "morgan";
import http = require("http");

interface ILogFieldOptions {
  application_type?: string;
  log_type?: string;
  service?: string;
}

declare namespace ServiceLogger {
  export interface ILog4broOptions {
    productionMode?: boolean;
    logDir?: string;
    silence?: boolean;
    dockerMode?: boolean;
    varKey?: string;
    logFieldOptions?: ILogFieldOptions;
    level?: string;
    logLevel?: string;
    serviceName?: string;
    stackdriver?: { scope: string };
    caller?: string;
    loggerName?: string;
  }
}

declare class ServiceLogger<
  Request extends http.IncomingMessage,
  Response extends http.ServerResponse
> {
  productionMode: boolean;
  varKey: string;
  dockerMode: boolean;
  logFieldOptions: ILogFieldOptions;
  silence: boolean;
  logDir: string;
  logLevel: string;
  serviceName: string;
  stackdriver: { scope: string };
  caller: string;
  skipDebug: boolean;
  LOG: bunyan;

  errors: any[];

  constructor(options: ServiceLogger.ILog4broOptions);
  constructor(
    loggerName: string,
    silence: boolean,
    logDir: string,
    productionMode: boolean,
    dockerMode: boolean,
    varKey: string,
    logFieldOptions: ILogFieldOptions,
    level: string,
    serviceName: string,
    caller: string,
    stackdriver: { scope: string }
  );

  createChild(defaultAdditionalFields?: any): ServiceLogger<Request, Response>;
  changeLogLevel(level: string): void;
  createLoggingDir(): void;
  applyMiddlewareAccessLog(
    expressApp: Application,
    customTokens?: any,
    accessLogOptions?: MorganOptions<Request, Response>
  ): Application;
  applyMiddlewareAccessLogFile(
    expressApp: Application,
    logFilePath: string
  ): Application;
  setGlobal(): void;

  trace(message: string, additionalFields?: any): void;
  debug(message: string, additionalFields?: any): void;
  info(message: string, additionalFields?: any): void;
  warn(message: string, additionalFields?: any): void;
  error(message: string, additionalFields?: any): void;
  fatal(message: string, additionalFields?: any): void;
  raw(message: any, support?: boolean): void;
}

export = ServiceLogger;
