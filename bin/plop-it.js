#!/usr/bin/env node
const program = require('commander')

program
  .version(require('../package').version)
  .usage('<command> [options]')
  .command('create', 'generate a new project from a template')
  .parse(process.argv)
