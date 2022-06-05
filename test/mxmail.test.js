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
  const r1 = send.delivered[0].result
  expect(r1.messageId).toBeDefined()
  expect(r1.envelope.to).toEqual(['bar@ethereal.email'])
  const r2 = send.delivered[1].result
  expect(r2.messageId).toBeDefined()
  expect(r2.envelope.to).toEqual(['baz@ethereal.email'])
})

xit('should send email to mx', async () => {
  const mailer2 = mxmail()
  const mail2 = {
    from: 'vidar@o4.no',
    to: 'vidar@eldoy.com',
    subject: 'test',
    text: 'test',
    html: 'test'
  }
  const send = await mailer2(mail2)
  const r1 = send.delivered[0].result
  expect(r1.messageId).toBeDefined()
  expect(r1.envelope.to).toEqual(['vidar@eldoy.com'])
})

it('should send email with CC and BCC', async () => {
  const mail2 = {
    cc: 'qux@ethereal.email',
    bcc: 'quux@ethereal.email',
    ...mail
  }
  const send = await mailer(mail2)
  const r1 = send.delivered[0].result
  expect(r1.messageId).toBeDefined()
  expect(r1.envelope.to).toEqual(['bar@ethereal.email'])
  const r2 = send.delivered[1].result
  expect(r2.messageId).toBeDefined()
  expect(r2.envelope.to).toEqual(['baz@ethereal.email'])
  const r3 = send.delivered[2].result
  expect(r3.messageId).toBeDefined()
  expect(r3.envelope.to).toEqual(['qux@ethereal.email'])
  const r4 = send.delivered[3].result
  expect(r4.messageId).toBeDefined()
  expect(r4.envelope.to).toEqual(['quux@ethereal.email'])
})
