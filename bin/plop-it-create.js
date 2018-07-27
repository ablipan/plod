/**
 * copy from https://github.com/vuejs/vue-cli/blob/v2.5.0/bin/vue-init
 */
const download = require('download-git-repo')
const ora = require('ora')
const home = require('user-home')
const path = require('path')
const program = require('commander')
const tildify = require('tildify')
const inquirer = require('inquirer')
const chalk = require('chalk')
const exists = require('fs').existsSync
const nodePlop = require('node-plop')
const execa = require('execa')

const logger = require('../utils/logger')
const localPath = require('../utils/local-path')

const isLocalPath = localPath.isLocalPath
const getTemplatePath = localPath.getTemplatePath

program
  .usage('<template-name> [project-name]')
  .option('-c, --clone', 'use git clone')
  .option('--offline', 'use cached template')
  .option('--generator', 'use which plop generator, \'default\' as default')

/**
 * Help.
 */
program.on('--help', () => {
  console.log('  Examples:')
  console.log()
  console.log(chalk.gray('    # create a new project from a github template'))
  console.log('    $ plop-it create username/repo my-project')
  console.log()
})

/**
 * Help.
 */
function help () {
  program.parse(process.argv)
  if (program.args.length < 1) return program.help()
}

help()

const template = program.args[0]
const rawName = program.args[1]
const clone = program.clone || false
const tmp = path.join(home, '.plop-it', template.replace(/[\/:]/g, '-'))
const to = path.resolve(rawName || '.')
const inPlace = !rawName || rawName === '.'
const name = inPlace ? path.relative('../', process.cwd()) : rawName
const generator = program.generator || 'default'

if (program.offline) {
  console.log(`> Use cached template at ${chalk.yellow(tildify(tmp))}`)
  template = tmp
}

if (exists(to)) {
  inquirer.prompt([{
    type: 'confirm',
    message: inPlace
      ? 'Generate project in current directory?'
      : 'Target directory exists. Continue?',
    name: 'ok'
  }], function (answers) {
    if (answers.ok) {
      run()
    }
  })
} else {
  run()
}

/**
 * Check, download and generate the project.
 */

function run () {
  // check if template is local
  if (isLocalPath(template)) {
    const templatePath = getTemplatePath(template)
    if (exists(templatePath)) {
      generate(err => {
        if (err) logger.fatal(err)
        console.log()
        logger.success('Generated "%s".', name)
      })
    } else {
      logger.fatal('Local template "%s" not found.', template)
    }
  } else {
    downloadAndGenerate(template)
  }
}

function generate(cb) {
  // console.log(template, to)
  // execa('npx plop', [generator])
  const plop = nodePlop(`${template}/plopfile.js`)
  const defaultGenerator = plop.getGenerator(generator)
  defaultGenerator.runPrompts().then(function(result) {
    console.log(result)
    cb()
  })
}

/**
 * Download a generate from a template repo.
 * @param {String} template
 * @param {String} dist
 */
function downloadAndGenerate () {
  const spinner = ora('downloading template')
  spinner.start()
  // Remove if local template exists
  if (exists(tmp)) rm(tmp)
  download(template, tmp, false, err => {
    spinner.stop()
    if (err) logger.fatal('Failed to download repo ' + template + ': ' + err.message.trim())
    generate(err => {
      if (err) logger.fatal(err)
      console.log()
      logger.success('Generated "%s".', name)
    })
  })
}
