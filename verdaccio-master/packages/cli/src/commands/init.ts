import { Command, Option } from 'clipanion';
import { findConfigFile, parseConfigFile } from '@verdaccio/config';
import { setup, logger } from '@verdaccio/logger';
import { initServer } from '@verdaccio/node-api';
import { ConfigRuntime } from '@verdaccio/types';

export const DEFAULT_PROCESS_NAME: string = 'verdaccio';

export class InitCommand extends Command {
  public static paths = [Command.Default];

  private port = Option.String('-l,-p,--listen,--port', {
    description: 'host:port number to listen on (default: localhost:4873)',
  });

  // eslint-disable-next-line
  static usage = Command.Usage({
    description: `launch the server`,
    details: `
      This start the registry in the default port.

      When used without arguments, it:

      - bootstrap the server at the port  \`4873\`

      The optional arguments are:

      - \`-l | --listen | -p | --port\` to switch the default server port,
      - \`-c | --config\` to define a different configuration path location,

    `,
    examples: [
      [`Runs the server with the default configuration`, `verdaccio`],
      [`Runs the server in the port 5000`, `verdaccio --listen 5000`],
      [
        `Runs the server by using a different absolute location of the configuration file`,
        `verdaccio --config /home/user/verdaccio/config.yaml`,
      ],
    ],
  });

  private config = Option.String('-c,--config', {
    description: 'use this configuration file (default: ./config.yaml)',
  });

  private initLogger(logConfig: ConfigRuntime) {
    try {
      if (logConfig.logs) {
        process.emitWarning(
          'config.logs is deprecated, rename configuration to "config.log" in singular'
        );
      }
      // FUTURE: remove fallback when is ready
      setup(logConfig.log || logConfig.logs);
    } catch {
      throw new Error('error on init logger');
    }
  }

  public async execute() {
    try {
      const configPathLocation = findConfigFile(this.config as string);
      const configParsed = parseConfigFile(configPathLocation);
      this.initLogger(configParsed);
      const { web } = configParsed;

      process.title = web?.title || DEFAULT_PROCESS_NAME;

      const { version, name } = require('../../package.json');

      await initServer(configParsed, this.port as string, version, name);
      logger.info('server started');
    } catch (err: any) {
      console.error(err);
      process.exit(1);
    }
  }
}
