
class MockMessageSender {
	constructor() {
		this.messages = [];
	}

	send(subject, text) {
		this.messages.push({ subject, text });
	}
}

module.exports = { MockMessageSender };