/* global AbortController */

import Stream, { PassThrough, Readable } from 'stream';
import { URL } from 'url';
import buildDebug from 'debug';
import _ from 'lodash';
import { Request, Headers } from 'undici-fetch';
import JSONStream from 'JSONStream';
import request from 'request';
import { buildToken } from '@verdaccio/utils';
import { ReadTarball } from '@verdaccio/streams';
import {
  TOKEN_BASIC,
  TOKEN_BEARER,
  HEADERS,
  HTTP_STATUS,
  HEADER_TYPE,
  CHARACTER_ENCODING,
} from '@verdaccio/commons-api';
import { Config, Callback, Logger, UpLinkConf, IReadTarball } from '@verdaccio/types';
import { errorUtils, validatioUtils, searchUtils } from '@verdaccio/core';
import { parseInterval } from './proxy-utils';
const LoggerApi = require('@verdaccio/logger');

const fetch = require('undici-fetch');
const debug = buildDebug('verdaccio:proxy');

const encode = function (thing): string {
  return encodeURIComponent(thing).replace(/^%40/, '@');
};

const jsonContentType = HEADERS.JSON;
const contentTypeAccept = `${jsonContentType};`;

/**
 * Just a helper (`config[key] || default` doesn't work because of zeroes)
 */
const setConfig = (config, key, def): string => {
  return _.isNil(config[key]) === false ? config[key] : def;
};

export type UpLinkConfLocal = UpLinkConf & {
  no_proxy?: string;
};

export interface ProxyList {
  [key: string]: IProxy;
}

export type ProxySearchParams = {
  headers?: Headers;
  url: string;
  query?: searchUtils.SearchQuery;
  abort?: AbortController;
};
export interface IProxy {
  config: UpLinkConfLocal;
  failed_requests: number;
  userAgent: string;
  ca?: string | void;
  logger: Logger;
  server_id: string;
  url: URL;
  maxage: number;
  timeout: number;
  max_fails: number;
  fail_timeout: number;
  upname: string;
  fetchTarball(url: string): IReadTarball;
  search(options: ProxySearchParams): Promise<Stream.Readable>;
  getRemoteMetadata(name: string, options: any, callback: Callback): void;
}

/**
 * Implements Storage interface
 * (same for storage.js, local-storage.js, up-storage.js)
 */
class ProxyStorage implements IProxy {
  public config: UpLinkConfLocal;
  public failed_requests: number;
  public userAgent: string;
  public ca: string | void;
  public logger: Logger;
  public server_id: string;
  public url: URL;
  public maxage: number;
  public timeout: number;
  public max_fails: number;
  public fail_timeout: number;
  public agent_options: any;
  // FIXME: upname is assigned to each instance
  // @ts-ignore
  public upname: string;
  // FIXME: proxy can be boolean or object, something smells here
  // @ts-ignore
  public proxy: any;
  // @ts-ignore
  public last_request_time: number | null;
  public strict_ssl: boolean;

  /**
   * Constructor
   * @param {*} config
   * @param {*} mainConfig
   */
  public constructor(config: UpLinkConfLocal, mainConfig: Config) {
    this.config = config;
    this.failed_requests = 0;
    this.userAgent = mainConfig.user_agent;
    this.ca = config.ca;
    this.logger = LoggerApi.logger.child({ sub: 'out' });
    this.server_id = mainConfig.server_id;

    this.url = new URL(this.config.url);
    this._setupProxy(this.url.hostname, config, mainConfig, this.url.protocol === 'https:');

    this.config.url = this.config.url.replace(/\/$/, '');

    if (this.config.timeout && Number(this.config.timeout) >= 1000) {
      this.logger.warn(
        [
          'Too big timeout value: ' + this.config.timeout,
          'We changed time format to nginx-like one',
          '(see http://nginx.org/en/docs/syntax.html)',
          'so please update your config accordingly',
        ].join('\n')
      );
    }

    // a bunch of different configurable timers
    this.maxage = parseInterval(setConfig(this.config, 'maxage', '2m'));
    this.timeout = parseInterval(setConfig(this.config, 'timeout', '30s'));
    this.max_fails = Number(setConfig(this.config, 'max_fails', 2));
    this.fail_timeout = parseInterval(setConfig(this.config, 'fail_timeout', '5m'));
    this.strict_ssl = Boolean(setConfig(this.config, 'strict_ssl', true));
    this.agent_options = setConfig(this.config, 'agent_options', {
      keepAlive: true,
      maxSockets: 40,
      maxFreeSockets: 10,
    });
  }

  /**
   * Fetch an asset.
   * @param {*} options
   * @param {*} cb
   * @return {Request}
   */
  private request(options: any, cb?: Callback): Stream.Readable {
    let json;

    if (this._statusCheck() === false) {
      const streamRead = new Stream.Readable();

      process.nextTick(function (): void {
        if (cb) {
          cb(errorUtils.getInternalError(errorUtils.API_ERROR.UPLINK_OFFLINE));
        }
        streamRead.emit('error', errorUtils.getInternalError(errorUtils.API_ERROR.UPLINK_OFFLINE));
      });
      streamRead._read = function (): void {};
      // preventing 'Uncaught, unspecified "error" event'
      streamRead.on('error', function (): void {});
      return streamRead;
    }

    const self = this;
    const headers: Headers = this._setHeaders(options);

    this._addProxyHeaders(options.req, headers);
    this._overrideWithUpLinkConfLocaligHeaders(headers);

    const method = options.method || 'GET';
    const uri = options.uri_full || this.config.url + options.uri;

    self.logger.info(
      {
        method: method,
        headers: headers,
        uri: uri,
      },
      "making request: '@{method} @{uri}'"
    );

    if (validatioUtils.isObject(options.json)) {
      json = JSON.stringify(options.json);
      headers['Content-Type'] = headers['Content-Type'] || HEADERS.JSON;
    }

    const requestCallback = cb
      ? function (err, res, body): void {
          let error;
          const responseLength = err ? 0 : body.length;
          // $FlowFixMe
          processBody();
          logActivity();
          // $FlowFixMe
          cb(err, res, body);

          /**
           * Perform a decode.
           */
          function processBody(): void {
            if (err) {
              error = err.message;
              return;
            }

            if (options.json && res.statusCode < 300) {
              try {
                // $FlowFixMe
                body = JSON.parse(body.toString(CHARACTER_ENCODING.UTF8));
              } catch (_err: any) {
                body = {};
                err = _err;
                error = err.message;
              }
            }

            if (!err && validatioUtils.isObject(body)) {
              if (_.isString(body.error)) {
                error = body.error;
              }
            }
          }
          /**
           * Perform a log.
           */
          function logActivity(): void {
            let message = "@{!status}, req: '@{request.method} @{request.url}'";
            // FIXME: use LOG_VERDACCIO_BYTES
            message += error ? ', error: @{!error}' : ', bytes: @{bytes.in}/@{bytes.out}';
            self.logger.http(
              {
                // if error is null/false change this to undefined so it wont log
                err: err || undefined,
                request: { method: method, url: uri },
                status: res != null ? res.statusCode : 'ERR',
                error: error,
                bytes: {
                  in: json ? json.length : 0,
                  out: responseLength || 0,
                },
              },
              message
            );
          }
        }
      : undefined;

    let requestOptions = {
      url: uri,
      method: method,
      headers: headers,
      body: json,
      proxy: this.proxy,
      encoding: null,
      gzip: true,
      timeout: this.timeout,
      strictSSL: this.strict_ssl,
      agentOptions: this.agent_options,
    };

    if (this.ca) {
      requestOptions = Object.assign({}, requestOptions, {
        ca: this.ca,
      });
    }

    const req = request(requestOptions, requestCallback);

    let statusCalled = false;
    req.on('response', function (res): void {
      // FIXME: _verdaccio_aborted seems not used
      // @ts-ignore
      if (!req._verdaccio_aborted && !statusCalled) {
        statusCalled = true;
        self._statusCheck(true);
      }

      if (_.isNil(requestCallback) === false) {
        (function do_log(): void {
          const message = "@{!status}, req: '@{request.method} @{request.url}' (streaming)";
          self.logger.http(
            {
              request: {
                method: method,
                url: uri,
              },
              status: _.isNull(res) === false ? res.statusCode : 'ERR',
            },
            message
          );
        })();
      }
    });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    req.on('error', function (_err): void {
      // FIXME: _verdaccio_aborted seems not used
      // @ts-ignore
      if (!req._verdaccio_aborted && !statusCalled) {
        statusCalled = true;
        self._statusCheck(false);
      }
    });
    // @ts-ignore
    return req;
  }

  /**
   * Set default headers.
   * @param {Object} options
   * @return {Object}
   * @private
   */
  private _setHeaders(options: any): Headers {
    const headers = options.headers || {};
    const accept = HEADERS.ACCEPT;
    const acceptEncoding = HEADERS.ACCEPT_ENCODING;
    const userAgent = HEADERS.USER_AGENT;

    headers[accept] = headers[accept] || contentTypeAccept;
    headers[acceptEncoding] = headers[acceptEncoding] || 'gzip';
    // registry.npmjs.org will only return search result if user-agent include string 'npm'
    headers[userAgent] = headers[userAgent] || `npm (${this.userAgent})`;

    return this._setAuth(headers);
  }

  /**
   * Validate configuration auth and assign Header authorization
   * @param {Object} headers
   * @return {Object}
   * @private
   */
  private _setAuth(headers: any): Headers {
    const { auth } = this.config;

    if (_.isNil(auth) || headers[HEADERS.AUTHORIZATION]) {
      return headers;
    }

    if (_.isObject(auth) === false && _.isObject(auth.token) === false) {
      this._throwErrorAuth('Auth invalid');
    }

    // get NPM_TOKEN http://blog.npmjs.org/post/118393368555/deploying-with-npm-private-modules
    // or get other variable export in env
    // https://github.com/verdaccio/verdaccio/releases/tag/v2.5.0
    let token: any;
    const tokenConf: any = auth;

    if (_.isNil(tokenConf.token) === false && _.isString(tokenConf.token)) {
      token = tokenConf.token;
    } else if (_.isNil(tokenConf.token_env) === false) {
      if (_.isString(tokenConf.token_env)) {
        token = process.env[tokenConf.token_env];
      } else if (_.isBoolean(tokenConf.token_env) && tokenConf.token_env) {
        token = process.env.NPM_TOKEN;
      } else {
        this.logger.error(errorUtils.ERROR_CODE.token_required);
        this._throwErrorAuth(errorUtils.ERROR_CODE.token_required);
      }
    } else {
      token = process.env.NPM_TOKEN;
    }

    if (_.isNil(token)) {
      this._throwErrorAuth(errorUtils.ERROR_CODE.token_required);
    }

    // define type Auth allow basic and bearer
    const type = tokenConf.type || TOKEN_BASIC;
    this._setHeaderAuthorization(headers, type, token);

    return headers;
  }

  /**
   * @param {string} message
   * @throws {Error}
   * @private
   */
  private _throwErrorAuth(message: string): Error {
    this.logger.error(message);
    throw new Error(message);
  }

  /**
   * Assign Header authorization with type authentication
   * @param {Object} headers
   * @param {string} type
   * @param {string} token
   * @private
   */
  private _setHeaderAuthorization(headers: any, type: string, token: any): void {
    const _type: string = type.toLowerCase();

    if (_type !== TOKEN_BEARER.toLowerCase() && _type !== TOKEN_BASIC.toLowerCase()) {
      this._throwErrorAuth(`Auth type '${_type}' not allowed`);
    }

    type = _.upperFirst(type);
    headers[HEADERS.AUTHORIZATION] = buildToken(type, token);
  }

  /**
   * It will add or override specified headers from config file.
   *
   * Eg:
   *
   * uplinks:
   npmjs:
   url: https://registry.npmjs.org/
   headers:
   Accept: "application/vnd.npm.install-v2+json; q=1.0"
   verdaccio-staging:
   url: https://mycompany.com/npm
   headers:
   Accept: "application/json"
   authorization: "Basic YourBase64EncodedCredentials=="

   * @param {Object} headers
   * @private
   */
  private _overrideWithUpLinkConfLocaligHeaders(headers: Headers): any {
    if (!this.config.headers) {
      return headers;
    }

    // add/override headers specified in the config
    /* eslint guard-for-in: 0 */
    for (const key in this.config.headers) {
      headers[key] = this.config.headers[key];
    }
  }

  /**
   * Get a remote package metadata
   * @param {*} name package name
   * @param {*} options request options, eg: eTag.
   * @param {*} callback
   */
  public getRemoteMetadata(name: string, options: any, callback: Callback): void {
    const headers = {};
    if (_.isNil(options.etag) === false) {
      headers['If-None-Match'] = options.etag;
      headers[HEADERS.ACCEPT] = contentTypeAccept;
    }

    this.request(
      {
        uri: `/${encode(name)}`,
        json: true,
        headers: headers,
        req: options.req,
      },
      (err, res, body): void => {
        if (err) {
          return callback(err);
        }
        if (res.statusCode === HTTP_STATUS.NOT_FOUND) {
          return callback(errorUtils.getNotFound(errorUtils.API_ERROR.NOT_PACKAGE_UPLINK));
        }
        if (!(res.statusCode >= HTTP_STATUS.OK && res.statusCode < HTTP_STATUS.MULTIPLE_CHOICES)) {
          const error = errorUtils.getInternalError(
            `${errorUtils.API_ERROR.BAD_STATUS_CODE}: ${res.statusCode}`
          );

          error.remoteStatus = res.statusCode;
          return callback(error);
        }
        callback(null, body, res.headers.etag);
      }
    );
  }

  /**
   * Fetch a tarball from the uplink.
   * @param {String} url
   * @return {Stream}
   */
  public fetchTarball(url: string) {
    const stream = new ReadTarball({});
    let current_length = 0;
    let expected_length;

    stream.abort = () => {};
    const readStream = this.request({
      uri_full: url,
      encoding: null,
      headers: {
        Accept: contentTypeAccept,
      },
    });

    readStream.on('response', function (res: any) {
      if (res.statusCode === HTTP_STATUS.NOT_FOUND) {
        return stream.emit('error', errorUtils.getNotFound(errorUtils.API_ERROR.NOT_FILE_UPLINK));
      }
      if (!(res.statusCode >= HTTP_STATUS.OK && res.statusCode < HTTP_STATUS.MULTIPLE_CHOICES)) {
        return stream.emit(
          'error',
          errorUtils.getInternalError(`bad uplink status code: ${res.statusCode}`)
        );
      }
      if (res.headers[HEADER_TYPE.CONTENT_LENGTH]) {
        expected_length = res.headers[HEADER_TYPE.CONTENT_LENGTH];
        stream.emit(HEADER_TYPE.CONTENT_LENGTH, res.headers[HEADER_TYPE.CONTENT_LENGTH]);
      }

      readStream.pipe(stream);
    });

    readStream.on('error', function (err) {
      stream.emit('error', err);
    });
    readStream.on('data', function (data) {
      current_length += data.length;
    });
    readStream.on('end', function (data) {
      if (data) {
        current_length += data.length;
      }
      if (expected_length && current_length != expected_length) {
        stream.emit('error', errorUtils.getInternalError(errorUtils.API_ERROR.CONTENT_MISMATCH));
      }
    });
    return stream;
  }

  /**
   * Perform a stream search.
   * @param {*} options request options
   * @return {Stream}
   */
  public async search({ url, abort }: ProxySearchParams): Promise<Stream.Readable> {
    debug('search url %o', url);

    let response;
    try {
      const fullURL = new URL(`${this.url}${url}`);
      // FIXME: a better way to remove duplicate slashes?
      const uri = fullURL.href.replace(/([^:]\/)\/+/g, '$1');
      this.logger.http({ uri, uplink: this.upname }, 'search request to uplink @{uplink} - @{uri}');
      const request = new Request(uri, {
        method: 'GET',
        // FUTURE: whitelist domains what we are sending not need it headers, security check
        // headers: new Headers({
        //   ...headers,
        //   connection: 'keep-alive',
        // }),
        signal: abort?.signal,
      });
      response = await fetch(request);
      debug('response.status  %o', response.status);

      if (response.status >= HTTP_STATUS.BAD_REQUEST) {
        throw errorUtils.getInternalError(`bad status code ${response.status} from uplink`);
      }

      const streamSearch = new PassThrough({ objectMode: true });
      const res = await response.text();
      const streamResponse = Readable.from(res);
      // objects is one of the properties on the body, it ignores date and total
      streamResponse.pipe(JSONStream.parse('objects')).pipe(streamSearch, { end: true });
      return streamSearch;
    } catch (err: any) {
      this.logger.error({ errorMessage: err?.message }, 'proxy search error: @{errorMessage}');
      throw err;
    }
  }

  /**
   * Add proxy headers.
   * FIXME: object mutations, it should return an new object
   * @param {*} req the http request
   * @param {*} headers the request headers
   */
  private _addProxyHeaders(req: any, headers: any): void {
    if (req) {
      // Only submit X-Forwarded-For field if we don't have a proxy selected
      // in the config file.
      //
      // Otherwise misconfigured proxy could return 407:
      // https://github.com/rlidwka/sinopia/issues/254
      // @ts-ignore
      if (!this.proxy) {
        headers[HEADERS.FORWARDED_FOR] =
          (req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'] + ', ' : '') +
          req.connection.remoteAddress;
      }
    }

    // always attach Via header to avoid loops, even if we're not proxying
    headers['Via'] = req?.headers['via'] ? req.headers['via'] + ', ' : '';

    headers['Via'] += '1.1 ' + this.server_id + ' (Verdaccio)';
  }

  /**
   * Check whether the remote host is available.
   * @param {*} alive
   * @return {Boolean}
   */
  private _statusCheck(alive?: boolean): boolean | void {
    if (arguments.length === 0) {
      return this._ifRequestFailure() === false;
    }
    if (alive) {
      if (this.failed_requests >= this.max_fails) {
        this.logger.warn(
          {
            host: this.url.host,
          },
          'host @{host} is back online'
        );
      }
      this.failed_requests = 0;
    } else {
      this.failed_requests++;
      if (this.failed_requests === this.max_fails) {
        this.logger.warn(
          {
            host: this.url.host,
          },
          'host @{host} is now offline'
        );
      }
    }

    this.last_request_time = Date.now();
  }

  /**
   * If the request failure.
   * @return {boolean}
   * @private
   */
  private _ifRequestFailure(): boolean {
    return (
      this.failed_requests >= this.max_fails &&
      Math.abs(Date.now() - (this.last_request_time as number)) < this.fail_timeout
    );
  }

  /**
   * Set up a proxy.
   * @param {*} hostname
   * @param {*} config
   * @param {*} mainconfig
   * @param {*} isHTTPS
   */
  private _setupProxy(
    hostname: string,
    config: UpLinkConfLocal,
    mainconfig: Config,
    isHTTPS: boolean
  ): void {
    let noProxyList;
    const proxy_key: string = isHTTPS ? 'https_proxy' : 'http_proxy';

    // get http_proxy and no_proxy configs
    if (proxy_key in config) {
      this.proxy = config[proxy_key];
    } else if (proxy_key in mainconfig) {
      this.proxy = mainconfig[proxy_key];
    }
    if ('no_proxy' in config) {
      noProxyList = config.no_proxy;
    } else if ('no_proxy' in mainconfig) {
      noProxyList = mainconfig.no_proxy;
    }

    // use wget-like algorithm to determine if proxy shouldn't be used
    if (hostname[0] !== '.') {
      hostname = '.' + hostname;
    }

    if (_.isString(noProxyList) && noProxyList.length) {
      noProxyList = noProxyList.split(',');
    }

    if (_.isArray(noProxyList)) {
      for (let i = 0; i < noProxyList.length; i++) {
        let noProxyItem = noProxyList[i];
        if (noProxyItem[0] !== '.') {
          noProxyItem = '.' + noProxyItem;
        }
        if (hostname.lastIndexOf(noProxyItem) === hostname.length - noProxyItem.length) {
          if (this.proxy) {
            this.logger.debug(
              { url: this.url.href, rule: noProxyItem },
              'not using proxy for @{url}, excluded by @{rule} rule'
            );
            // @ts-ignore
            this.proxy = false;
          }
          break;
        }
      }
    }

    // if it's non-string (i.e. "false"), don't use it
    if (_.isString(this.proxy) === false) {
      delete this.proxy;
    } else {
      this.logger.debug(
        { url: this.url.href, proxy: this.proxy },
        'using proxy @{proxy} for @{url}'
      );
    }
  }
}

export { ProxyStorage };
