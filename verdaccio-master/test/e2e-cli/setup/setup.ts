import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawn } from 'child_process';
import buildDebug from 'debug';
import { yellow } from 'kleur';
import { pnpmGlobal } from '../utils/process';
import * as __global from '../utils/global.js';
import { SETUP_VERDACCIO_PORT } from '../utils/utils';
// import { waitOnRegistry } from '../utils/registry';

const debug = buildDebug('verdaccio:e2e:setup');

module.exports = async () => {
  const tempRoot = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), 'verdaccio-cli-e2e-'));
  debug('dirname folder %o', __dirname);
  debug('temporary folder %o', tempRoot);
  // @ts-ignore
  __global.addItem('dir-root', tempRoot);
  debug(yellow(`Add temp root folder: ${tempRoot}`));
  const destinationConfigFile = path.join(tempRoot, 'verdaccio.yaml');
  debug('destination config file %o', destinationConfigFile);
  fs.copyFileSync(
    path.join(__dirname, '../config/_bootstrap_verdaccio.yaml'),
    destinationConfigFile
  );
  // @ts-ignore
  global.__namespace = __global;
  debug(`current directory %o`, process.cwd());
  const verdaccioPath = path.normalize(
    path.join(process.cwd(), '../../packages/verdaccio/debug/bootstrap.js')
  );
  debug(process.env.DEBUG);
  debug('verdaccio path %o', verdaccioPath);
  const childProcess = spawn(
    'node',
    [verdaccioPath, '-c', './verdaccio.yaml', '-l', SETUP_VERDACCIO_PORT],
    // @ts-ignore
    {
      cwd: tempRoot,
      env: {
        ...process.env,
      },
      stdio: 'ignore',
    }
  );
  // @ts-ignore
  global.registryProcess = childProcess;
  // await waitOnRegistry(SETUP_VERDACCIO_PORT);
  // publish current build version on local registry
  const rootFolder = path.normalize(path.join(process.cwd(), '../../'));
  // install the local changes to verdaccio
  // the published package will be installed from every suite
  await pnpmGlobal(
    rootFolder,
    'publish',
    '--filter',
    ' ./packages',
    '--access',
    'public',
    '--git-checks',
    'false',
    '--registry',
    `http://localhost:${SETUP_VERDACCIO_PORT}`
  );
};
