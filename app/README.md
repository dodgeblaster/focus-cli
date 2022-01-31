oclif-hello-world
=================

oclif example Hello World CLI

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/oclif-hello-world.svg)](https://npmjs.org/package/oclif-hello-world)
[![CircleCI](https://circleci.com/gh/oclif/hello-world/tree/main.svg?style=shield)](https://circleci.com/gh/oclif/hello-world/tree/main)
[![Downloads/week](https://img.shields.io/npm/dw/oclif-hello-world.svg)](https://npmjs.org/package/oclif-hello-world)
[![License](https://img.shields.io/npm/l/oclif-hello-world.svg)](https://github.com/oclif/hello-world/blob/main/package.json)

<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
# Usage
<!-- usage -->
```sh-session
$ npm install -g rise-focus
$ focus COMMAND
running command...
$ focus (--version)
rise-focus/0.0.0 darwin-x64 node-v14.15.1
$ focus --help [COMMAND]
USAGE
  $ focus COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`focus deploy`](#focus-deploy)
* [`focus help [COMMAND]`](#focus-help-command)
* [`focus plugins`](#focus-plugins)
* [`focus plugins:inspect PLUGIN...`](#focus-pluginsinspect-plugin)
* [`focus plugins:install PLUGIN...`](#focus-pluginsinstall-plugin)
* [`focus plugins:link PLUGIN`](#focus-pluginslink-plugin)
* [`focus plugins:uninstall PLUGIN...`](#focus-pluginsuninstall-plugin)
* [`focus plugins update`](#focus-plugins-update)

## `focus deploy`

Say hello

```
USAGE
  $ focus deploy [-s <value>] [-r <value>]

FLAGS
  -r, --region=<value>  AWS Region
  -s, --stage=<value>   Stage of deployment

DESCRIPTION
  Say hello

EXAMPLES
  $ oex hello friend --from oclif
  hello friend from oclif! (./src/commands/hello/index.ts)
```

_See code: [dist/commands/deploy/index.ts](https://github.com/dodgeblaster/rise-cli/blob/v0.0.0/dist/commands/deploy/index.ts)_

## `focus help [COMMAND]`

Display help for focus.

```
USAGE
  $ focus help [COMMAND] [-n]

ARGUMENTS
  COMMAND  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for focus.
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v5.1.10/src/commands/help.ts)_

## `focus plugins`

List installed plugins.

```
USAGE
  $ focus plugins [--core]

FLAGS
  --core  Show core plugins.

DESCRIPTION
  List installed plugins.

EXAMPLES
  $ focus plugins
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v2.0.11/src/commands/plugins/index.ts)_

## `focus plugins:inspect PLUGIN...`

Displays installation properties of a plugin.

```
USAGE
  $ focus plugins:inspect PLUGIN...

ARGUMENTS
  PLUGIN  [default: .] Plugin to inspect.

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Displays installation properties of a plugin.

EXAMPLES
  $ focus plugins:inspect myplugin
```

## `focus plugins:install PLUGIN...`

Installs a plugin into the CLI.

```
USAGE
  $ focus plugins:install PLUGIN...

ARGUMENTS
  PLUGIN  Plugin to install.

FLAGS
  -f, --force    Run yarn install with force flag.
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Installs a plugin into the CLI.

  Can be installed from npm or a git url.

  Installation of a user-installed plugin will override a core plugin.

  e.g. If you have a core plugin that has a 'hello' command, installing a user-installed plugin with a 'hello' command
  will override the core plugin implementation. This is useful if a user needs to update core plugin functionality in
  the CLI without the need to patch and update the whole CLI.

ALIASES
  $ focus plugins add

EXAMPLES
  $ focus plugins:install myplugin 

  $ focus plugins:install https://github.com/someuser/someplugin

  $ focus plugins:install someuser/someplugin
```

## `focus plugins:link PLUGIN`

Links a plugin into the CLI for development.

```
USAGE
  $ focus plugins:link PLUGIN

ARGUMENTS
  PATH  [default: .] path to plugin

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Links a plugin into the CLI for development.

  Installation of a linked plugin will override a user-installed or core plugin.

  e.g. If you have a user-installed or core plugin that has a 'hello' command, installing a linked plugin with a 'hello'
  command will override the user-installed or core plugin implementation. This is useful for development work.

EXAMPLES
  $ focus plugins:link myplugin
```

## `focus plugins:uninstall PLUGIN...`

Removes a plugin from the CLI.

```
USAGE
  $ focus plugins:uninstall PLUGIN...

ARGUMENTS
  PLUGIN  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ focus plugins unlink
  $ focus plugins remove
```

## `focus plugins update`

Update installed plugins.

```
USAGE
  $ focus plugins update [-h] [-v]

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Update installed plugins.
```
<!-- commandsstop -->
