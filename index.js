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

  console.log({ records })

  // Return the first record that verifies
  for (const record of records) {
    const transport = nodemailer.createTransport({ host: record.exchange, port: 25 })
    try {
      await transport.verify()
      return record.exchange
    } catch (e) {
      console.log(`Could not verify ${record.exchange} (${record.priority})`)
      console.log(e.message)
    }
  }
}

function mxmail(config = {}) {
  async function mailer(mail = {}) {
    if (!mail.to) {
      throw Error('to field is missing')
    }
    if (!mail.from) {
      throw Error('from field is missing')
    }

    console.log('Sending mail', JSON.stringify(mail, null, 2))

    // Recipients to send to
    const recipients = [mail.to, mail.cc, mail.bcc].join(',').split(',').filter(x => x).map(x => x.trim())
    console.log('Found recipients', recipients)

    const hostCache = {}, delivered = [], failed = []

    for (const recipient of recipients) {
      const domain = getDomain(recipient)
      let { host = hostCache[domain], port = 25, auth } = config
      console.log({ host })

      if (!host) {
        host = hostCache[domain] = await getHost(domain)
      }

      try {
        const transport = nodemailer.createTransport({ host, port, auth })

        // Set up mail
        mail = { text: '', html: '', subject: '', ...mail }
        mail.envelope = { from: mail.from, to: recipient }

        const result = await transport.sendMail(mail)
        console.log('Message sent: %s', result.messageId)
        console.log(result)

        const preview = nodemailer.getTestMessageUrl(result)
        if (preview) {
          console.log('Preview URL: %s', preview)
        }
        delivered.push({ result, mail })
      } catch (e) {
        console.log(`Sending to recipient ${recipient} failed!`)
        console.log(e.message)
        const error = { name: e.name, message: e.message, stack: e.stack }
        failed.push({ error, mail })
      }
    }
    return { delivered, failed }
  }
  return mailer
}

// Based on nodemailer, generates a mail id
mxmail.id = function(from) {
  const random = [2, 2, 2, 6].reduce(
    (prev, len) => prev + '-' + crypto.randomBytes(len).toString('hex'),
    crypto.randomBytes(4).toString('hex')
  )
  const domain = (getDomain(from) || os.hostname() || 'localhost').split('@').pop()
  return `<${random}@${domain}>`
}

module.exports = mxmail