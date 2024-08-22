
class MockWeb3 {
	constructor() {
		this.blockNumber = 1;
		this.logs = [];
	}

	setLogs(blockNumber, logs) {
		this.blockNumber = blockNumber;
		this.logs = logs;
	}

	async getBlockNumber() {
		return this.blockNumber;
	}

	getPastLogs(filter) {
		const logs = this.logs;
		this.logs = [];

		return logs;
	}

	getBlock(blockNumber) {
		return { timestamp: Date.now() / 100 - blockNumber };
	}

	encodeEventSignature(eventAbi) {
		return this.web3.eth.abi.encodeEventSignature(eventAbi);
	}

	decodeLog(eventAbiInputs, data, topics) {
		return data;
	}
}

module.exports = { MockWeb3 };