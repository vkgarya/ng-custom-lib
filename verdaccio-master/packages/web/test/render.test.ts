import path from 'path';
import supertest from 'supertest';
import { setup } from '@verdaccio/logger';
import { HEADER_TYPE, HEADERS, HTTP_STATUS } from '@verdaccio/commons-api';
import { initializeServer } from './helper';

setup([]);

const mockManifest = jest.fn();
jest.mock('@verdaccio/ui-theme', () => mockManifest());

describe('test web server', () => {
  beforeAll(() => {
    mockManifest.mockReturnValue(() => ({
      manifestFiles: {
        js: ['runtime.js', 'vendors.js', 'main.js'],
      },
      staticPath: path.join(__dirname, 'static'),
      manifest: require('./partials/manifest/manifest.json'),
    }));
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockManifest.mockClear();
  });

  describe('render', () => {
    test('should return the root', async () => {
      return supertest(await initializeServer('default-test.yaml'))
        .get('/')
        .set('Accept', HEADERS.TEXT_HTML)
        .expect(HEADER_TYPE.CONTENT_TYPE, HEADERS.TEXT_HTML_UTF8)
        .expect(HTTP_STATUS.OK);
    });

    test('should return the body for a package detail page', async () => {
      return supertest(await initializeServer('default-test.yaml'))
        .get('/-/web/section/some-package')
        .set('Accept', HEADERS.TEXT_HTML)
        .expect(HEADER_TYPE.CONTENT_TYPE, HEADERS.TEXT_HTML_UTF8)
        .expect(HTTP_STATUS.OK);
    });

    test('should static file not found', async () => {
      return supertest(await initializeServer('default-test.yaml'))
        .get('/-/static/not-found.js')
        .set('Accept', HEADERS.TEXT_HTML)
        .expect(HTTP_STATUS.NOT_FOUND);
    });

    test('should static file found', async () => {
      return supertest(await initializeServer('default-test.yaml'))
        .get('/-/static/main.js')
        .set('Accept', HEADERS.TEXT_HTML)
        .expect(HTTP_STATUS.OK);
    });
  });
});
