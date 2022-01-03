# Contributing

> Any change matters, whatever the size, just do it.

We're happy that you're considering contributing! To help, we've prepared these
guidelines for you:

**Table of Contents**

- [Contributing](#contributing)
  - [How Do I Contribute?](#how-do-i-contribute)
  - [Development Setup](#development-setup)
    - [Building the project](#building-the-project)
    - [Running test](#running-test)
    - [Running and debugging](#running-and-debugging)
    - [Debugging compiled code](#debugging-compiled-code)
  - [Reporting Bugs](#reporting-bugs)
    - [Read the documentation](#read-the-documentation)
    - [What's is not considered a bug?](#whats-is-not-considered-a-bug)
    - [Issue Search](#issue-search)
    - [Chat](#chat)
  - [Request Features](#request-features)
  - [Contributing Guidelines](#contributing-guidelines)
    - [Submitting a Pull Request](#submitting-a-pull-request)
    - [Make Changes and Commit](#make-changes-and-commit)
      - [Caveats](#caveats)
      - [Before Commit](#before-commit)
      - [Commit Guidelines](#commit-guidelines)
    - [Adding a changeset](#adding-a-changeset)
    - [Update Tests](#update-tests)
  - [Develop Plugins](#develop-plugins)

## How Do I Contribute?

There are many ways to contribute:

- Report a bug
- Request a feature you think would be great for Verdaccio
- Fix bugs
- Test and triage bugs reported by others
- Work on requested/approved features
- Improve the codebase (linting, naming, comments, test descriptions, etc...)

The Verdaccio project is split into several areas:

- **Core**: The [core](https://github.com/verdaccio/verdaccio) is the main repository, built with **Node.js**.
- **Website**: we use [**Docusaurus**](https://docusaurus.io/) for the **website** and if you are familiar with this technology, you might become the official webmaster.
- **User Interface**: The [user Interface](https://github.com/verdaccio/ui) is based in **react** and **material-ui** and looking for front-end contributors.
- **Kubernetes and Helm**: Ts the official repository for the [**Helm chart**](https://github.com/verdaccio/charts).

> There are other areas to contribute, like documentation, translation which are
> not hosted on this repo but check the last section of this notes for further
> information.

## Development Setup

Verdaccio uses [pnpm](https://pnpm.io) as the package manager for development in this repository.

If you are using pnpm for the first time the [pnpm configuration documentation](https://pnpm.io/configuring) may be useful to avoid any potential problems with the following steps.

**Note**: pnpm uses npm's configuration formats so check that your global `.npmrc` file does not inadvertently disable package locks. In other words, your `.npmrc` file **should not** contain

```
package-lock=false
```

This setting would cause the `pnpm install` command to install incorrect versions of package dependencies and the subsequent `pnpm build` step would likely fail.

To begin your development setup, please install the latest version of pnpm globally:

```
npm i -g pnpm
```

With pnpm installed, the first step is installing all dependencies:

```
pnpm install
```

### Building the project

To build the project run

```
pnpm build
```

### Running test

```
pnpm test
```

Verdaccio is a mono repository. To run the tests for for a specific package:

```
cd packages/store
pnpm test
```

or an specific test in that package:

```
pnpm test test/merge.dist.tags.spec.ts
```

or a single test unit:

```
pnpm test test/merge.dist.tags.spec.ts -- -t 'simple'
```

Coverage reporting is enabled by default, but you can turn it off to speed up
test runs:

```
pnpm test test/merge.dist.tags.spec.ts -- -t 'simple' --coverage=false
```

You can enable increased [`debug`](https://www.npmjs.com/package/debug) output:

```
DEBUG=verdaccio:* pnpm test
```

More details in the debug section

### Running and debugging

We use [`debug`](https://www.npmjs.com/package/debug) to add helpful debugging
output to the code. Each package has it owns namespace.

#### Debugging compiled code

Currently you can only run pre-compiled packages in debug mode. To enable debug
while running add the `verdaccio` namespace using the `DEBUG` environment
variable, like this:

```
DEBUG=verdaccio:* node packages/verdaccio/debug/bootstrap.js
```

You can filter this output to just the packages you're interested in using
namespaces:

```
DEBUG=verdaccio:plugin:* node packages/verdaccio/debug/bootstrap.js
```

The debug code is intended to analyze what is happening under the hood and none
of the output is sent to the logger module.

## Reporting Bugs

**Bugs are considered features that are not working as described in
documentation.**

If you've found a bug in Verdaccio **that isn't a security risk**, please file
a report in our [issue tracker](https://github.com/verdaccio/verdaccio/issues).

> **NOTE: Verdaccio still does not support all npm commands. Some were not
> considered important and others have not been requested yet.**

### What's is not considered a bug?

- _Third party integrations_: proxies integrations, external plugins
- _Package managers_: If a package manager does not support a specific command
  or cannot be reproduced with another package manager
- _Features clearly flagged as not supported_
- _Node.js issues installation in any platform_: If you cannot install the
  global package (this is considered external issue)
- Any ticket which has beed flagged as an [external issue
  ](https://github.com/verdaccio/verdaccio/labels/external-issue)

If you intend to report a **security** issue, please follow our [Security policy
guidelines](https://github.com/verdaccio/verdaccio/security/policy).

### Issue Search

Before reporting a bug please:

- Search for existing issues to see if it has already been reported
- Look for the **question** label: we have labelled questions for easy follow-up
  as [questions](https://github.com/verdaccio/verdaccio/labels/question)

In case any of those match with your search, up-vote it (using GitHub reactions)
or add additional helpful details to the existing issue to show that it's
affecting multiple people.

### Chat

Questions can be asked via [Discord](http://chat.verdaccio.org/)

**Please use the `#help` channel.**

## Request Features

New feature requests are welcome. Analyse whether the idea fits within scope of
the project. Adding in context and the use-case will really help!

**Please provide:**

- A detailed description the advantages of your request
- Whether or not it's compatible with `npm`, `pnpm` and [_yarn classic_
  ](https://github.com/yarnpkg/yarn) or [_yarn berry_
  ](https://github.com/yarnpkg/berry).
- A potential implementation or design
- Whatever else is on your mind! 🤓

## Contributing Guidelines

It's very exciting to become a Verdaccio contributor 🙌🏼. To ensure a fast code
review and merge, please follow the next guidelines:

> Any contribution gives you the right to be part of this organization as
> _collaborator_.

### Submitting a Pull Request

The following are the steps you should follow when creating a pull request.
Subsequent pull requests only need to follow step 3 and beyond.

1. Fork the repository on GitHub
2. Clone the forked repository to your machine
3. Make your changes and commit them to your local repository
4. Rebase and push your commits to your GitHub remote fork/repository
5. Issue a Pull Request to the official repository
6. Your Pull Request is reviewed by a committer and merged into the repository

**NOTE**: While there are other ways to accomplish the steps using other tools,
the examples here will assume most actions will be performed via `git` on
command line.

For more information on maintaining a fork, please see the GitHub Help article
titled [Fork a Repo](https://help.github.com/articles/fork-a-repo/), and
information on [rebasing](https://git-scm.com/book/en/v2/Git-Branching-Rebasing).

### Make Changes and Commit

#### Caveats

Feel free to commit as much times you want in your branch, but keep on mind on
this repository we `git squash` on merge by default, as we like to maintain a
clean git history.

#### Before Commit

Before committing, **you must ensure there are no linting errors and
all tests pass.** To do this, run these commands before create the PR:

```bash
pnpm lint
pnpm format
pnpm build
pnpm test
```

> note: eslint and formatting are run separately, keep code formatting
> before push.

All good? Perfect! You should create the pull request.

#### Commit Guidelines

For example:

- `feat: A new feature`
- `fix: A bug fix`

A commit of the type feat introduces a new feature to the codebase (this
correlates with MINOR in semantic versioning).

e.g.:

```
feat: xxxxxxxxxx
```

A commit of the type fix patches a bug in your codebase (this correlates with
PATCH in semantic versioning).

e.g.:

```
fix: xxxxxxxxxxx
```

Commits types such as as `docs:`,`style:`,`refactor:`,`perf:`,`test:` and
`chore:` are valid but have no effect on versioning: **please use them!**

All commits message are going to be validated when they are created using
_husky_ hooks.

> Please try to provide one single commit to help a clean and easy merge process

### Adding a changeset

We use [changesets](https://github.com/atlassian/changesets) in order to
generate a detailed Changelog as possible.

Adding a changeset with your Pull Request is essential if you want your
contribution to get merged (unless is a change that does not affect library
functionality, eg: typo, docs, readme, add additional test or linting code). To
create a changeset please run:

```
pnpm changeset
```

Then select the packages you want to include in your changeset navigating
through them and press the spacebar to check it, on finish press enter to move
to the next step.

```
🦋  Which packages would you like to include? …
✔ changed packages
 changed packages
  ✔ @verdaccio/api
  ✔ @verdaccio/auth
  ✔ @verdaccio/cli
  ✔ @verdaccio/config
  ✔ @verdaccio/commons-api
```

The next question would be if you want a _major bump_. This is not the usual
scenario, most likely you want a patch, and in that case press enter 2 times
(to skip minor)

```
🦋  Which packages should have a major bump? …
✔ all packages
  ✔ @verdaccio/config@5.0.0-alpha.0
```

Once you have the desired bump you need, the CLI will ask for a summary. Here
you have full freedom on what to include:

```
🦋  Which packages would you like to include? · @verdaccio/config
🦋  Which packages should have a major bump? · No items were selected
🦋  Which packages should have a minor bump? · No items were selected
🦋  The following packages will be patch bumped:
🦋  @verdaccio/config@5.0.0-alpha.0
🦋  Please enter a summary for this change (this will be in the changelogs). Submit empty line to open external editor
🦋  Summary ›
```

The last step is to confirm your changeset or abort the operation:

```
🦋  Is this your desired changeset? (Y/n) · true
🦋  Changeset added! - you can now commit it
🦋
🦋  If you want to modify or expand on the changeset summary, you can find it here
🦋  info /Users/user/verdaccio.clone/.changeset/light-scissors-smell.md
```

Once the changeset is added (all will have an unique name) you can freely edit
using markdown, adding additional information, code snippets or whatever else
you consider to be relevant.

All that information will be part of the **changelog**. Be concise but
informative! It's recommended to add your nickname and GitHub link to your
profile.

**PRs that do not follow the commit message guidelines will not be merged.**

### Update Tests

**Any change in source code must include test updates**.

If you need help with how testing works, please [refer to the following guide
](https://github.com/verdaccio/verdaccio/wiki/Running-and-Debugging-tests).

**If you are introducing new features, you MUST include new tests. PRs for
features without tests will not be merged.**

## Develop Plugins

Plugins are add-ons that extend the functionality of the application.

If you want to develop your own plugin:

1. Check whether there is a legacy Sinopia plugin for the feature that you need
   via [npmjs](https://www.npmjs.com/search?q=sinopia)
2. Keep in mind the [life-cycle to load a plugin
   ](https://verdaccio.org/docs/en/dev-plugins)
3. You are free to host your plugin in your repository
4. Provide a detailed description of your plugin to help users understand how to
   use it
