const mxmail = require('../index.js')

const mail = {
  from: '"Fred Foo 👻" <foo@example.com>',
  to: 'bar@ethereal.email, baz@ethereal.email',
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
  const send = await mailer(mail)
  expect(send.delivered[0].result.messageId).toBeDefined()
})

it('should generate a message ID', async () => {
  let id = mailer.id()
  expect(typeof id).toBe('string')

  id = mailer.id('vidar@test.com')
  expect(id.endsWith('test.com>')).toBe(true)

  id = mailer.id('Vidar <vidar@test.com>')
  expect(id.endsWith('test.com>')).toBe(true)
})
