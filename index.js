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

module.exports = function(config = {}) {
  config.port = config.port || 25

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

    const recordCache = {}

    for (const domain of domains) {
      // Find records, cache in case domains are the same
      let records = recordCache[domain]
      if (!records) {
        records = await getRecords(domain)
        recordCache[domain] = records
      }
      console.log('Found records', records)
      if (!records.length) {
        throw Error(`no mx records found for ${domain}`)
      }

      let transport

      // Find host if it's missing
      if (!config.host) {
        for (let i = 0; i < records.length; i++) {
          const record = records[i]
          config.host = record.exchange
          try {
            transport = nodemailer.createTransport(config)
            await transport.verify()
            break
          } catch (e) {
            // Verify failed, try next record
            if (!records[i+1]) {
              throw e
            }
          }
        }
      }

      console.log('Found config', config)

      if (!config.host) {
        throw Error(`config not available for domain ${domain}`)
      }

      if (!transport) {
        transport = nodemailer.createTransport(config)
        await transport.verify()
      }

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
        console.log(`Sending to domain ${domain} failed, skipping...`)
        console.log(e.message)
        console.log(JSON.stringify(mail, null, 2))
        throw e
      }
    }
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
