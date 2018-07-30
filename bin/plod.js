#!/usr/bin/env node
const download = require('download-git-repo')
const ora = require('ora')
const home = require('user-home')
const path = require('path')
const program = require('commander')
const tildify = require('tildify')
const chalk = require('chalk')
const exists = require('fs').existsSync
const nodePlop = require('node-plop')
const rm = require('rimraf').sync
const logger = require('../utils/logger')
const localPath = require('../utils/local-path')

program
  .version(require('../package').version)
  .usage('<template-name>')
  .option('-c, --clone', 'use git clone')
  .option('--offline', 'use cached template')
  .option('--generator', 'use which plop generator, \'default\' as default')
  .on('--help', () => {
    console.log('  Examples:')
    console.log()
    console.log(chalk.gray('    # create a new project from a github template'))
    console.log('    $ plod username/repo')
    console.log()
  })

/**
 * Help.
 */
function help() {
  program.parse(process.argv)
  if (program.args.length < 1) return program.help()
}

help()

const isLocalPath = localPath.isLocalPath
const getTemplatePath = localPath.getTemplatePath
let template = program.args[0]
const clone = program.clone || false
const tmp = path.join(home, '.plod', template.replace(/[\/:]/g, '-'))
const generator = program.generator || 'default'

if (program.offline) {
  console.log(`> Use cached template at ${chalk.yellow(tildify(tmp))}`)
  template = tmp
}

/**
 * Check, download and generate the project.
 */
function run() {
  // check if template is local
  if (isLocalPath(template)) {
    const templatePath = getTemplatePath(template)
    if (exists(templatePath)) {
      generate(templatePath, err => {
        if (err) logger.fatal(err)
        console.log()
        logger.success('Generated done.')
      })
    } else {
      logger.fatal('Local template "%s" not found.', template)
    }
  } else {
    downloadAndGenerate(template)
  }
}

run()

/**
 * Generate the project with node-plop(https://github.com/amwmedia/node-plop)
 * @param {Function} cb
 */
function generate(path, cb) {
  const plop = nodePlop(`${path}/plopfile.js`)
  const defaultGenerator = plop.getGenerator(generator)
  defaultGenerator.runPrompts().then(result => {
    defaultGenerator.runActions(result).then(() => {
      cb()
    }, err => cb(err))
  }, err => cb(err))
}

/**
 * Download a generate from a template repo.
 * @param {String} template
 * @param {String} dist
 */
function downloadAndGenerate() {
  const spinner = ora('downloading template')
  spinner.start()
  // Remove if local template exists
  if (exists(tmp)) rm(tmp)
  download(template, tmp, { clone: clone }, err => {
    spinner.stop()
    if (err) logger.fatal('Failed to download repo ' + template + ': ' + err.message.trim())
    generate(tmp, err => {
      if (err) logger.fatal(err)
      console.log()
      logger.success('Generated done.')
    })
  })
}
