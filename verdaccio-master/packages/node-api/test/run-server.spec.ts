import request from 'supertest';
import { runServer } from '../src';
describe('startServer via API', () => {
  test('should provide all HTTP server data', async () => {
    const webServer = await runServer();
    expect(webServer).toBeDefined();
    await request(webServer).get('/').expect(200);
  });

  test('should fail on start with empty configuration', async () => {
    // @ts-expect-error
    await expect(runServer({})).rejects.toThrow(
      'AssertionError [ERR_ASSERTION]: CONFIG: storage path not defined'
    );
  });

  test('should fail on start with null as entry', async () => {
    await expect(runServer(null)).rejects.toThrow('config file must be an object');
  });
});
