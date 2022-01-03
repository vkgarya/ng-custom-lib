import path from 'path';
import supertest from 'supertest';
import { setup } from '@verdaccio/logger';
import { IGetPackageOptions } from '@verdaccio/store';
import { HEADERS, HEADER_TYPE, HTTP_STATUS } from '@verdaccio/commons-api';

import { NOT_README_FOUND } from '../src/api/readme';
import { initializeServer } from './helper';

setup([]);

const mockManifest = jest.fn();
jest.mock('@verdaccio/ui-theme', () => mockManifest());

jest.mock('@verdaccio/store', () => ({
  Storage: class {
    public init() {
      return Promise.resolve();
    }
    public getPackage({ name, callback }: IGetPackageOptions) {
      callback(null, {
        name,
        ['dist-tags']: {
          latest: '1.0.0',
        },
        versions: {
          ['1.0.0']: {
            name,
          },
        },
      });
    }
  },
  SearchInstance: {
    configureStorage: () => {},
  },
}));

describe('readme api', () => {
  beforeAll(() => {
    mockManifest.mockReturnValue(() => ({
      staticPath: path.join(__dirname, 'static'),
      manifestFiles: {
        js: ['runtime.js', 'vendors.js', 'main.js'],
      },
      manifest: require('./partials/manifest/manifest.json'),
    }));
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockManifest.mockClear();
  });

  test('should fetch readme scoped package', async () => {
    const response = await supertest(await initializeServer('default-test.yaml'))
      .get('/-/verdaccio/package/readme/@scope/pk1-test')
      .set('Accept', HEADERS.TEXT_PLAIN)
      .expect(HEADER_TYPE.CONTENT_TYPE, HEADERS.TEXT_PLAIN_UTF8)
      .expect(HTTP_STATUS.OK);
    expect(response.text).toMatch(NOT_README_FOUND);
  });

  test('should fetch readme a package', async () => {
    const response = await supertest(await initializeServer('default-test.yaml'))
      .get('/-/verdaccio/package/readme/pk1-test')
      .set('Accept', HEADERS.TEXT_PLAIN)
      .expect(HEADER_TYPE.CONTENT_TYPE, HEADERS.TEXT_PLAIN_UTF8)
      .expect(HTTP_STATUS.OK);
    expect(response.text).toMatch(NOT_README_FOUND);
  });
});
