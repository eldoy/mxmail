const dns = require('dns')
const nodemailer = require('nodemailer')
const mailutil = require('mailutil')

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

    // Recipients to send to
    const recipients = [mail.to, mail.cc, mail.bcc].join(',').split(',').filter(x => x).map(x => x.trim())

    const hostCache = {}, delivered = [], failed = []

    for (const recipient of recipients) {
      const domain = mailutil.domain(recipient)
      let { host = hostCache[domain], port = 25, auth, name } = config
      if (!host) {
        host = hostCache[domain] = await getHost(domain)
      }

      try {
        const transport = nodemailer.createTransport({ host, port, auth, name })

        // Set up mail
        mail = { text: '', html: '', subject: '', ...mail }
        mail.envelope = { from: mail.from, to: recipient }

        const result = await transport.sendMail(mail)
        console.log('Message sent: %s', result.messageId)

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

module.exports = mxmail