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

module.exports = async function(mail = {}, config) {
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
    try {
      // Find config
      if (!config || !Object.keys(config).length) {
        config = getConfig(await getRecords(host))
      }

      if (!config) {
        throw Error(`config not available for host ${host}`)
      }

      // Create transport
      const transport = nodemailer.createTransport(config)
      await transport.verify()

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
      return { error: { message: e.message } }
    }
  }
}
