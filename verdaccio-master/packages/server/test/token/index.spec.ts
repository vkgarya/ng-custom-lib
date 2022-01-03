import path from 'path';
import request from 'supertest';
import _ from 'lodash';

import {
  HEADERS,
  HTTP_STATUS,
  HEADER_TYPE,
  TOKEN_BEARER,
  API_ERROR,
  SUPPORT_ERRORS,
} from '@verdaccio/commons-api';

import { buildToken } from '@verdaccio/utils';
import {
  generateRamdonStorage,
  DOMAIN_SERVERS,
  mockServer,
  getNewToken,
  configExample,
} from '@verdaccio/mock';

import { setup, logger } from '@verdaccio/logger';

import endPointAPI from '../../src';

setup([]);

const credentials = { name: 'jota_token', password: 'secretPass' };

const generateTokenCLI = async (app, token, payload): Promise<any> => {
  return new Promise((resolve, reject) => {
    request(app)
      .post('/-/npm/v1/tokens')
      .set(HEADER_TYPE.CONTENT_TYPE, HEADERS.JSON)
      .send(JSON.stringify(payload))
      .set(HEADERS.AUTHORIZATION, buildToken(TOKEN_BEARER, token))
      .expect(HEADER_TYPE.CONTENT_TYPE, HEADERS.JSON_CHARSET)
      .end(function (err, resp) {
        if (err) {
          // eslint-disable-next-line prefer-promise-reject-errors
          return reject([err, resp]);
        }
        resolve([err, resp]);
      });
  });
};

const deleteTokenCLI = async (app, token, tokenToDelete): Promise<any> => {
  return new Promise((resolve, reject) => {
    request(app)
      .delete(`/-/npm/v1/tokens/token/${tokenToDelete}`)
      .set(HEADER_TYPE.CONTENT_TYPE, HEADERS.JSON)
      .set(HEADERS.AUTHORIZATION, buildToken(TOKEN_BEARER, token))
      .expect(HEADER_TYPE.CONTENT_TYPE, HEADERS.JSON_CHARSET)
      .end(function (err, resp) {
        if (err) {
          // eslint-disable-next-line prefer-promise-reject-errors
          return reject([err, resp]);
        }
        resolve([err, resp]);
      });
  });
};

describe('endpoint unit test', () => {
  let app;
  let mockRegistry;
  let token;

  beforeAll(async function () {
    const store = generateRamdonStorage();
    const mockServerPort = 55543;
    const configForTest = configExample(
      {
        storage: store,
        config_path: store,
        uplinks: {
          npmjs: {
            url: `http://${DOMAIN_SERVERS}:${mockServerPort}`,
          },
        },
      },
      'token.spec.yaml',
      __dirname
    );

    app = await endPointAPI(configForTest);
    const binPath = require.resolve('verdaccio/bin/verdaccio');
    const storePath = path.join(__dirname, '/mock/store');
    mockRegistry = await mockServer(mockServerPort, { storePath, silence: true }).init(binPath);
    token = await getNewToken(request(app), credentials);
  });

  afterAll(function () {
    const [registry, pid] = mockRegistry;
    registry.stop();
    logger.info(`registry ${pid} has been stopped`);
  });

  describe('Registry Token Endpoints', () => {
    test('should list empty tokens', async () => {
      return new Promise((resolve, reject) => {
        request(app)
          .get('/-/npm/v1/tokens')
          .set(HEADERS.AUTHORIZATION, buildToken(TOKEN_BEARER, token))
          .expect(HEADER_TYPE.CONTENT_TYPE, HEADERS.JSON_CHARSET)
          .expect(HTTP_STATUS.OK)
          .end(function (err, resp) {
            if (err) {
              return reject(err);
            }

            const { objects, urls } = resp.body;
            expect(objects).toHaveLength(0);
            expect(urls.next).toEqual('');
            resolve(urls);
          });
      });
    });

    test('should generate one token', async () => {
      await generateTokenCLI(app, token, {
        password: credentials.password,
        readonly: false,
        cidr_whitelist: [],
      });
      return new Promise((resolve, reject) => {
        request(app)
          .get('/-/npm/v1/tokens')
          .set(HEADERS.AUTHORIZATION, buildToken(TOKEN_BEARER, token))
          .expect(HEADER_TYPE.CONTENT_TYPE, HEADERS.JSON_CHARSET)
          .expect(HTTP_STATUS.OK)
          .end(function (err, resp) {
            if (err) {
              return reject(err);
            }

            const { objects, urls } = resp.body;

            expect(objects).toHaveLength(1);
            const [tokenGenerated] = objects;
            expect(tokenGenerated.user).toEqual(credentials.name);
            expect(tokenGenerated.readonly).toBeFalsy();
            expect(tokenGenerated.token).toMatch(/.../);
            expect(_.isString(tokenGenerated.created)).toBeTruthy();

            // we don't support pagination yet
            expect(urls.next).toEqual('');
            resolve(urls);
          });
      });
    });

    test('should delete a token', async () => {
      const res = await generateTokenCLI(app, token, {
        password: credentials.password,
        readonly: false,
        cidr_whitelist: [],
      });

      const t = res[1].body.token;

      await deleteTokenCLI(app, token, t);
      return new Promise((resolve, reject) => {
        request(app)
          .get('/-/npm/v1/tokens')
          .set(HEADERS.AUTHORIZATION, buildToken(TOKEN_BEARER, token))
          .expect(HEADER_TYPE.CONTENT_TYPE, HEADERS.JSON_CHARSET)
          .expect(HTTP_STATUS.OK)
          .end(function (err) {
            if (err) {
              return reject(err);
            }

            // FIXME: enable these checks
            // const { objects } = resp.body;
            // expect(objects).toHaveLength(0);
            resolve(null);
          });
      });
    });

    describe('handle errors', () => {
      test('should fail with wrong credentials', async () => {
        try {
          await generateTokenCLI(app, token, {
            password: 'wrongPassword',
            readonly: false,
            cidr_whitelist: [],
          });
        } catch (e: any) {
          const [err, body] = e;
          expect(err).not.toBeNull();
          expect(body.error).toEqual(API_ERROR.BAD_USERNAME_PASSWORD);
          expect(body.status).toEqual(HTTP_STATUS.UNAUTHORIZED);
        }
      });

      test('should fail if readonly is missing', async () => {
        try {
          const res = await generateTokenCLI(app, token, {
            password: credentials.password,
            cidr_whitelist: [],
          });

          expect(res[0]).toBeNull();
          expect(res[1].body.error).toEqual(SUPPORT_ERRORS.PARAMETERS_NOT_VALID);
        } catch (e: any) {
          return Promise.reject(e);
        }
      });

      test('should fail if cidr_whitelist is missing', async () => {
        try {
          const res = await generateTokenCLI(app, token, {
            password: credentials.password,
            readonly: false,
          });

          expect(res[0]).toBeNull();
          expect(res[1].body.error).toEqual(SUPPORT_ERRORS.PARAMETERS_NOT_VALID);
        } catch (e: any) {
          return Promise.reject(e);
        }
      });
    });
  });
});
