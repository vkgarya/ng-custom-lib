import Path from 'path';
import _ from 'lodash';
import buildDebug from 'debug';

import { logger } from '@verdaccio/logger';
import { Config, IPlugin } from '@verdaccio/types';

const debug = buildDebug('verdaccio:plugin:loader');

export const MODULE_NOT_FOUND = 'MODULE_NOT_FOUND';

/**
 * Requires a module.
 * @param {*} path the module's path
 * @return {Object}
 */
function tryLoad(path: string): any {
  try {
    return require(path);
  } catch (err: any) {
    if (err.code === MODULE_NOT_FOUND) {
      return null;
    }
    throw err;
  }
}

function mergeConfig(appConfig, pluginConfig): Config {
  return _.merge(appConfig, pluginConfig);
}

function isValid(plugin): boolean {
  return _.isFunction(plugin) || _.isFunction(plugin.default);
}

function isES6(plugin): boolean {
  return Object.keys(plugin).includes('default');
}

// export type PluginGeneric<R, T extends IPlugin<R> = ;

/**
 * Load a plugin following the rules
 * - First try to load from the internal directory plugins (which will disappear soon or later).
 * - A second attempt from the external plugin directory
 * - A third attempt from node_modules, in case to have multiple match as for instance
 * verdaccio-ldap
 * and sinopia-ldap. All verdaccio prefix will have preferences.
 * @param {*} config a reference of the configuration settings
 * @param {*} pluginConfigs
 * @param {*} params a set of params to initialize the plugin
 * @param {*} sanityCheck callback that check the shape that should fulfill the plugin
 * @return {Array} list of plugins
 */
export function loadPlugin<T extends IPlugin<T>>(
  config: Config,
  pluginConfigs: any = {},
  params: any,
  sanityCheck: any,
  prefix: string = 'verdaccio'
): any[] {
  return Object.keys(pluginConfigs).map((pluginId: string): IPlugin<T> => {
    let plugin;

    const localPlugin = Path.resolve(__dirname + '/../plugins', pluginId);
    // try local plugins first
    plugin = tryLoad(localPlugin);

    // try the external plugin directory
    if (plugin === null && config.plugins) {
      const pluginDir = config.plugins;
      const externalFilePlugin = Path.resolve(pluginDir, pluginId);
      plugin = tryLoad(externalFilePlugin);

      // npm package
      if (plugin === null && pluginId.match(/^[^\.\/]/)) {
        plugin = tryLoad(Path.resolve(pluginDir, `${prefix}-${pluginId}`));
        // compatibility for old sinopia plugins
        if (!plugin) {
          plugin = tryLoad(Path.resolve(pluginDir, `sinopia-${pluginId}`));
        }
      }
    }

    // npm package
    if (plugin === null && pluginId.match(/^[^\.\/]/)) {
      plugin = tryLoad(`${prefix}-${pluginId}`);
      // compatibility for old sinopia plugins
      if (!plugin) {
        plugin = tryLoad(`sinopia-${pluginId}`);
      }
    }

    if (plugin === null) {
      plugin = tryLoad(pluginId);
    }

    // relative to config path
    if (plugin === null && pluginId.match(/^\.\.?($|\/)/)) {
      plugin = tryLoad(Path.resolve(Path.dirname(config.config_path), pluginId));
    }

    if (plugin === null) {
      logger.error(
        { content: pluginId, prefix },
        'plugin not found. try npm install @{prefix}-@{content}'
      );
      throw Error(`
        ${prefix}-${pluginId} plugin not found. try "npm install ${prefix}-${pluginId}"`);
    }

    if (!isValid(plugin)) {
      logger.error(
        { content: pluginId },
        '@{prefix}-@{content} plugin does not have the right code structure'
      );
      throw Error(`"${pluginId}" plugin does not have the right code structure`);
    }

    /* eslint new-cap:off */
    try {
      plugin = isES6(plugin)
        ? new plugin.default(mergeConfig(config, pluginConfigs[pluginId]), params)
        : plugin(pluginConfigs[pluginId], params);
    } catch (error: any) {
      plugin = null;
      logger.error({ error, pluginId }, 'error loading a plugin @{pluginId}: @{error}');
    }
    /* eslint new-cap:off */

    if (plugin === null || !sanityCheck(plugin)) {
      logger.error(
        { content: pluginId, prefix },
        "@{prefix}-@{content} doesn't look like a valid plugin"
      );
      throw Error(`sanity check has failed, "${pluginId}" is not a valid plugin`);
    }

    debug('Plugin successfully loaded: %o-%o', pluginId, prefix);
    return plugin;
  });
}
