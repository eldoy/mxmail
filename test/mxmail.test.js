const mxmail = require('../index.js')

const mail = {
  from: '"Fred Foo 👻" <foo@example.com>',
  to: 'bar@example.com, baz@example.com',
  subject: 'Hello ✔',
  text: 'Are you ready?',
  html: '<b>Are you ready?</b>'
}

const config = {
  host: 'smtp.ethereal.email',
  port: 587,
  auth: {
    user: 'virginia.cassin10@ethereal.email',
    pass: '1md9Xes49Nbfka6aFw'
  }
}

const mailer = mxmail(config)

it('should send email', async () => {
  const result = await mailer(mail)
  expect(result.messageId).toBeDefined()
})

it('should generate a message ID', async () => {
  const id = mailer.id()
  expect(typeof id).toBe('string')
})
