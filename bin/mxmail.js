#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const os = require('os')
const settings = path.join(os.homedir(), '.mxmail.json')
if (!fs.existsSync(settings)) {
  console.log(`Settings file not found in ${settings}`)
  process.exit(0)
}

const mxmail = require('../index.js')

let { from, config, aliases = {} } = require(settings)

let to = process.argv[2] || ''
to = aliases[to] || to

const subject = process.argv[3]
const message = process.argv[4]
const attachments = process.argv.slice(5).map(function(file) {
  const filename = path.basename(file)
  return { filename, path: file }
})

mxmail({ to, from, subject, text: message, html: message, attachments }, config)
