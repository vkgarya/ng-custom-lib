# Change Log

## 11.0.0-6-next.6

### Major Changes

- 459b6fa7: refactor: search v1 endpoint and local-database

  - refactor search `api v1` endpoint, improve performance
  - remove usage of `async` dependency https://github.com/verdaccio/verdaccio/issues/1225
  - refactor method storage class
  - create new module `core` to reduce the ammount of modules with utilities
  - use `undici` instead `node-fetch`
  - use `fastify` instead `express` for functional test

  ### Breaking changes

  - plugin storage API changes
  - remove old search endpoint (return 404)
  - filter local private packages at plugin level

  The storage api changes for methods `get`, `add`, `remove` as promise base. The `search` methods also changes and recieves a `query` object that contains all query params from the client.

  ```ts
  export interface IPluginStorage<T> extends IPlugin {
    add(name: string): Promise<void>;
    remove(name: string): Promise<void>;
    get(): Promise<any>;
    init(): Promise<void>;
    getSecret(): Promise<string>;
    setSecret(secret: string): Promise<any>;
    getPackageStorage(packageInfo: string): IPackageStorage;
    search(query: searchUtils.SearchQuery): Promise<searchUtils.SearchItem[]>;
    saveToken(token: Token): Promise<any>;
    deleteToken(user: string, tokenKey: string): Promise<any>;
    readTokens(filter: TokenFilter): Promise<Token[]>;
  }
  ```

### Patch Changes

- Updated dependencies [459b6fa7]
  - @verdaccio/commons-api@11.0.0-6-next.4
  - @verdaccio/streams@11.0.0-6-next.4

## 11.0.0-6-next.5

### Major Changes

- 5c5057fc: feat: node api new structure based on promise

  ```js
  import { runServer } from '@verdaccio/node-api';
  // or
  import { runServer } from 'verdaccio';

  const app = await runServer(); // default configuration
  const app = await runServer('./config/config.yaml');
  const app = await runServer({ configuration });
  app.listen(4000, event => {
    // do something
  });
  ```

  ### Breaking Change

  If you are using the node-api, the new structure is Promise based and less arguments.

### Patch Changes

- @verdaccio/streams@11.0.0-alpha.3

## 11.0.0-6-next.4

### Major Changes

- cb2281a5: # async storage plugin bootstrap

  Gives a storage plugin the ability to perform asynchronous tasks on initialization

  ## Breaking change

  Plugin must have an init method in which asynchronous tasks can be executed

  ```js
  public async init(): Promise<void> {
     this.data = await this._fetchLocalPackages();
     this._sync();
  }
  ```

## 10.0.0-alpha.3

### Patch Changes

- fecbb9be: chore: add release step to private regisry on merge changeset pr
- Updated dependencies [fecbb9be]
  - @verdaccio/commons-api@10.0.0-alpha.3
  - @verdaccio/streams@10.0.0-alpha.3

## 10.0.0-alpha.2

### Minor Changes

- 54c58d1e: feat: add server rate limit protection to all request

  To modify custom values, use the server settings property.

  ```markdown
  server:

  ## https://www.npmjs.com/package/express-rate-limit#configuration-options

  rateLimit:
  windowMs: 1000
  max: 10000
  ```

  The values are intended to be high, if you want to improve security of your server consider
  using different values.

### Patch Changes

- Updated dependencies [54c58d1e]
  - @verdaccio/commons-api@10.0.0-alpha.2
  - @verdaccio/streams@10.0.0-alpha.2

## 10.0.0-alpha.1

### Major Changes

- d87fa026: feat!: experiments config renamed to flags

  - The `experiments` configuration is renamed to `flags`. The functionality is exactly the same.

  ```js
  flags: token: false;
  search: false;
  ```

  - The `self_path` property from the config file is being removed in favor of `config_file` full path.
  - Refactor `config` module, better types and utilities

### Patch Changes

- Updated dependencies [d87fa026]
- Updated dependencies [da1ee9c8]
- Updated dependencies [26b494cb]
- Updated dependencies [b57b4338]
- Updated dependencies [31af0164]
  - @verdaccio/commons-api@10.0.0-alpha.1
  - @verdaccio/streams@10.0.0-alpha.1

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [9.7.2](https://github.com/verdaccio/monorepo/compare/v9.7.1...v9.7.2) (2020-07-20)

**Note:** Version bump only for package verdaccio-google-cloud

## [9.7.1](https://github.com/verdaccio/monorepo/compare/v9.7.0...v9.7.1) (2020-07-10)

**Note:** Version bump only for package verdaccio-google-cloud

# [9.7.0](https://github.com/verdaccio/monorepo/compare/v9.6.1...v9.7.0) (2020-06-24)

**Note:** Version bump only for package verdaccio-google-cloud

## [9.6.1](https://github.com/verdaccio/monorepo/compare/v9.6.0...v9.6.1) (2020-06-07)

**Note:** Version bump only for package verdaccio-google-cloud

# [9.5.0](https://github.com/verdaccio/monorepo/compare/v9.4.1...v9.5.0) (2020-05-02)

**Note:** Version bump only for package verdaccio-google-cloud

# [9.4.0](https://github.com/verdaccio/monorepo/compare/v9.3.4...v9.4.0) (2020-03-21)

**Note:** Version bump only for package verdaccio-google-cloud

## [9.3.2](https://github.com/verdaccio/monorepo/compare/v9.3.1...v9.3.2) (2020-03-08)

**Note:** Version bump only for package verdaccio-google-cloud

## [9.3.1](https://github.com/verdaccio/monorepo/compare/v9.3.0...v9.3.1) (2020-02-23)

**Note:** Version bump only for package verdaccio-google-cloud

# [9.3.0](https://github.com/verdaccio/monorepo/compare/v9.2.0...v9.3.0) (2020-01-29)

**Note:** Version bump only for package verdaccio-google-cloud

# [9.0.0](https://github.com/verdaccio/monorepo/compare/v8.5.3...v9.0.0) (2020-01-07)

### Bug Fixes

- **verdaccio-google-cloud:** catch missing Secret on first run ([#247](https://github.com/verdaccio/monorepo/issues/247)) ([7742eea](https://github.com/verdaccio/monorepo/commit/7742eeaf061f1fe870e4de69ae7e0e5b649e273b))

### chore

- update dependencies ([68add74](https://github.com/verdaccio/monorepo/commit/68add743159867f678ddb9168d2bc8391844de47))

### BREAKING CHANGES

- @verdaccio/eslint-config requires ESLint >=6.8.0 and Prettier >=1.19.1 to fix compatibility with overrides.extends config

## [8.5.2](https://github.com/verdaccio/monorepo/compare/v8.5.1...v8.5.2) (2019-12-25)

### Bug Fixes

- add types for storage handler ([#307](https://github.com/verdaccio/monorepo/issues/307)) ([c35746e](https://github.com/verdaccio/monorepo/commit/c35746ebba071900db172608dedff66a7d27c23d))

## [8.5.1](https://github.com/verdaccio/monorepo/compare/v8.5.0...v8.5.1) (2019-12-24)

**Note:** Version bump only for package verdaccio-google-cloud

# [8.5.0](https://github.com/verdaccio/monorepo/compare/v8.4.2...v8.5.0) (2019-12-22)

**Note:** Version bump only for package verdaccio-google-cloud

## [8.4.2](https://github.com/verdaccio/monorepo/compare/v8.4.1...v8.4.2) (2019-11-23)

**Note:** Version bump only for package verdaccio-google-cloud

## [8.4.1](https://github.com/verdaccio/monorepo/compare/v8.4.0...v8.4.1) (2019-11-22)

**Note:** Version bump only for package verdaccio-google-cloud

# [8.4.0](https://github.com/verdaccio/monorepo/compare/v8.3.0...v8.4.0) (2019-11-22)

**Note:** Version bump only for package verdaccio-google-cloud

# [8.3.0](https://github.com/verdaccio/monorepo/compare/v8.2.0...v8.3.0) (2019-10-27)

**Note:** Version bump only for package verdaccio-google-cloud

# [8.2.0](https://github.com/verdaccio/monorepo/compare/v8.2.0-next.0...v8.2.0) (2019-10-23)

**Note:** Version bump only for package verdaccio-google-cloud

# [8.2.0-next.0](https://github.com/verdaccio/monorepo/compare/v8.1.4...v8.2.0-next.0) (2019-10-08)

### Bug Fixes

- fixed lint errors ([5e677f7](https://github.com/verdaccio/monorepo/commit/5e677f7))
- plugins/google-cloud/package.json & plugins/google-cloud/.snyk to reduce vulnerabilities ([b81aba4](https://github.com/verdaccio/monorepo/commit/b81aba4))
- plugins/google-cloud/package.json & plugins/google-cloud/.snyk to reduce vulnerabilities ([5eb3717](https://github.com/verdaccio/monorepo/commit/5eb3717))

## [8.1.2](https://github.com/verdaccio/monorepo/compare/v8.1.1...v8.1.2) (2019-09-29)

**Note:** Version bump only for package verdaccio-google-cloud

## [8.1.1](https://github.com/verdaccio/monorepo/compare/v8.1.0...v8.1.1) (2019-09-26)

**Note:** Version bump only for package verdaccio-google-cloud

# [8.1.0](https://github.com/verdaccio/monorepo/compare/v8.0.1-next.1...v8.1.0) (2019-09-07)

**Note:** Version bump only for package verdaccio-google-cloud

## [8.0.1-next.1](https://github.com/verdaccio/monorepo/compare/v8.0.1-next.0...v8.0.1-next.1) (2019-08-29)

**Note:** Version bump only for package verdaccio-google-cloud

## [8.0.1-next.0](https://github.com/verdaccio/monorepo/compare/v8.0.0...v8.0.1-next.0) (2019-08-29)

### Bug Fixes

- **package:** update @google-cloud/storage to version 3.2.0 ([8a0b0dc](https://github.com/verdaccio/monorepo/commit/8a0b0dc))

# [8.0.0](https://github.com/verdaccio/verdaccio-google-cloud/compare/v8.0.0-next.4...v8.0.0) (2019-08-22)

**Note:** Version bump only for package verdaccio-google-cloud

# [8.0.0-next.4](https://github.com/verdaccio/verdaccio-google-cloud/compare/v8.0.0-next.3...v8.0.0-next.4) (2019-08-18)

**Note:** Version bump only for package verdaccio-google-cloud

# [8.0.0-next.3](https://github.com/verdaccio/verdaccio-google-cloud/compare/v8.0.0-next.2...v8.0.0-next.3) (2019-08-16)

### Bug Fixes

- CI build ([4d586fb](https://github.com/verdaccio/verdaccio-google-cloud/commit/4d586fb))

# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [0.0.10](https://github.com/verdaccio/verdaccio-google-cloud/compare/v0.0.9...v0.0.10) (2019-06-22)

### Bug Fixes

- **config:** add resumable flag to configuration ([30de355](https://github.com/verdaccio/verdaccio-google-cloud/commit/30de355))
- **storage:** disable resumable uploads ([aa8328c](https://github.com/verdaccio/verdaccio-google-cloud/commit/aa8328c))
- remove unused dependency ([fdd90a9](https://github.com/verdaccio/verdaccio-google-cloud/commit/fdd90a9))
- update [@google-cloud](https://github.com/google-cloud) deps ([71be436](https://github.com/verdaccio/verdaccio-google-cloud/commit/71be436))

<a name="0.0.9"></a>

## [0.0.9](https://github.com/verdaccio/verdaccio-google-cloud/compare/v0.0.8...v0.0.9) (2018-10-23)

### Bug Fixes

- changed how key is generated for datastore.save to prevent duplicate entries. Key is now the name of the package ([#8](https://github.com/verdaccio/verdaccio-google-cloud/issues/8)) ([e21331b](https://github.com/verdaccio/verdaccio-google-cloud/commit/e21331b))

<a name="0.0.8"></a>

## [0.0.8](https://github.com/verdaccio/verdaccio-google-cloud/compare/v0.0.7...v0.0.8) (2018-07-22)
