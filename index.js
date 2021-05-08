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
      records.filter(r => r.exchange).sort((a, b) => a.priority - b.priority)
      resolve(records)
    })
  })
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

    // Hosts to send to
    const hosts = mail.to.split(',').map(getHost)
    console.log('Found hosts', hosts)

    const recordCache = {}

    for (const host of hosts) {
      // Find records, cache in case hosts are the same
      let records = recordCache[host]
      if (!records) {
        records = await getRecords(host)
        recordCache[host] = records
      }
      console.log('Found records', records)
      if (!records.length) {
        throw Error(`no mx records found for ${host}`)
      }

      let transport

      // Find host if it's missing
      if (!config.host) {
        config.port = config.port || 25
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
        throw Error(`config not available for host ${host}`)
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
        console.log(`Sending to host ${host} failed, skipping...`)
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
    const host = (getHost(from) || os.hostname() || 'localhost').split('@').pop()
    return `<${random}@${host}>`
  }

  return mailer
}
