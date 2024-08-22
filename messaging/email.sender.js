const nodemailer = require('nodemailer');

class EmailSender {
	constructor() {
		this.sender = process.env.EMAIL_SENDER;
		this.recipient = process.env.EMAIL_RECIPIENT;
		this.transporter = nodemailer.createTransport({
			host: process.env.EMAIL_HOST,
			port: process.env.EMAIL_PORT,
			secure: process.env.EMAIL_SECURE,
			auth: {
				user: process.env.EMAIL_USER,
				pass: process.env.EMAIL_PASS,
			},
		});
	}

	send(subject, text) {
		this.transporter.sendMail({
			from: this.sender,
			to: this.recipient,
			subject,
			text,
		});
	}
}

module.exports = { EmailSender };