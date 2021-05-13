const os = require('os')
const crypto = require('crypto')
const dns = require('dns')
const nodemailer = require('nodemailer')

function getDomain(email) {
  const m = /[^@]+@([\w\d\-\.]+)/.exec(email)
  return m && m[1]
}

function getRecords(domain) {
  return new Promise((resolve, reject) => {
    dns.resolveMx(domain, function(err, records) {
      if (err) reject(err)
      records = records.filter(r => r.exchange).sort((a, b) => a.priority - b.priority)
      resolve(records)
    })
  })
}

async function getHost(domain) {
  const records = await getRecords(domain)

  // Return the first record that verifies
  for (let i = 0; i < records.length; i++) {
    const record = records[i]
    const transport = nodemailer.createTransport({ host: domain, port: 25 })
    try {
      await transport.verify()
      return record.exchange
    } catch (e) {
      console.log(`Could not verify ${record.exchange} (${record.priority})`)
      console.log(e.message)
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

    console.log('Sending mail', JSON.stringify(mail, null, 2))

    // Domains to send to
    const domains = mail.to.split(',').map(getDomain)
    console.log('Found domains', domains)

    const hostCache = {}
    const delivered = []
    const failed = []

    for (const domain of domains) {
      let { host = hostCache[domain], port = 25, auth } = config

      if (!host) {
        host = hostCache[domain] = await getHost(domain)
      }

      try {
        const transport = nodemailer.createTransport({ host, port, auth })

        const result = await transport.sendMail(mail)
        console.log('Message sent: %s', result.messageId)

        const preview = nodemailer.getTestMessageUrl(result)
        if (preview) {
          console.log('Preview URL: %s', preview)
        }
        console.log(result)
        delivered.push({ result, mail })
      } catch (e) {
        console.log(`Sending to domain ${domain} failed!`)
        console.log(e.message)
        const error = { name: e.name, message: e.message, stack: e.stack }
        failed.push({ error, mail })
      }
    }
    return { delivered, failed }
  }

  // Based on nodemailer
  mailer.id = function(from) {
    const random = [2, 2, 2, 6].reduce(
      (prev, len) => prev + '-' + crypto.randomBytes(len).toString('hex'),
      crypto.randomBytes(4).toString('hex')
    )
    const domain = (getDomain(from) || os.hostname() || 'localhost').split('@').pop()
    return `<${random}@${domain}>`
  }

  return mailer
}
