# Mxmail

Send email from the command line or your app.

### Installation

```
npm i mxmail
```

### Usage

```js
const mxmail = require('mxmail')

// If config is defined, mx lookup is skipped
const config = {
  host: 'smtp.ethereal.email',
  port: 587,
  auth: {
    user: 'virginia.cassin10@ethereal.email',
    pass: '1md9Xes49Nbfka6aFw'
  }
}
const mailer = mxmail(config)

// Set up mail
const mail = {
  from: '"Fred Foo 👻" <foo@example.com>',
  to: 'bar@example.com, baz@example.com',
  subject: 'Hello ✔',
  text: 'Are you ready?',
  html: '<b>Are you ready?</b>'
}

// Will lookup mx records automatically for each email in 'to'
const result = await mailer(mail)
```

### Command line

Install the command line interface with:
```
npm i -g mxmail
```

Add a settings file in ~/.mxmail.json:
```json
{
  "from": "vidar@example.com",
  "config": {
    "host": "smtp.ethereal.email",
    "port": 587,
    "auth": {
      "user": "virginia.cassin10@ethereal.email",
      "pass": "1md9Xes49Nbfka6aFw"
    }
  },
  "aliases": {
    "@sp": "suong@example.com"
  }
}
```

Send email like this from the command line (terminal):
```
mx suong@example.com subject "This is the message"
```

Replace with aliases like this:
```
mx @sp subject "This is the message"
```

Send file attachments like this:
```
mx @ve "File" "Check this" ~/file.jpg
```

Using zsh alias:
```
alias file='mx @ve "" ""'
file ~/file.jpg
```

MIT Licensed. Enjoy!
