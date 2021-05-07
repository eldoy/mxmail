const os = require('os')
const crypto = require('crypto')
const dns = require('dns')
const nodemailer = require('nodemailer')

function getHost(email) {
  const m = /[^@]+@([\w\d\-\.]+)/.exec(email)
  return m && m[1]
}

function getRecords(host) {
  return new Promise((resolve, reject) => {
    dns.resolveMx(host, function(err, records) {
      if (err) reject(err)
      records.sort((a, b) => a.priority - b.priority)
      resolve(records)
    })
  })
}

function getConfig(records) {
  for (const record of records) {
    if (record.exchange) {
      return { host: record.exchange, port: 25 }
    }
  }
}

module.exports = function(config = {}) {

  async function mailer(mail = {}) {
    if (!mail.to) {
      throw Error('to field is missing')
    }

    if (!mail.from) {
      throw Error('from field is missing')
    }

    // Defaults
    mail = { text: '', html: '', subject: '', ...mail }

    // Hosts to send to
    const hosts = mail.to.split(',').map(getHost)

    for (const host of hosts) {
      // Find records
      const records = await getRecords(host)

      if (!records.length) {
        throw Error(`no mx records found`)
      }

      // Find config
      if (!Object.keys(config).length) {
        config = getConfig(records)
      }

      if (!config) {
        throw Error(`config not available for host ${host}`)
      }

      // Create transport and verify
      const transport = nodemailer.createTransport(config)
      await transport.verify()

      try {
        // Send mail
        const result = await transport.sendMail(mail)
        console.log('Message sent: %s', result.messageId)
        const preview = nodemailer.getTestMessageUrl(result)
        if (preview) {
          console.log('Preview URL: %s', preview)
        }
        return result
      } catch (e) {
        console.error(`Sending to host ${host} failed, skipping...`)
        console.error(e.message)
        console.error(JSON.stringify(mail, null, 2))
        return { error: { message: e.message } }
      }
    }
  }

  // Based on nodemailer
  mailer.id = function(from) {
    const random = [2, 2, 2, 6].reduce(
      (prev, len) => prev + '-' + crypto.randomBytes(len).toString('hex'),
      crypto.randomBytes(4).toString('hex')
    )
    const host = (getHost(from) || os.hostname() || 'localhost').split('@').pop()
    return `<${random}@${host}>`
  }

  return mailer
}
