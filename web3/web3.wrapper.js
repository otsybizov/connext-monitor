const { Web3 } = require("web3");

class Web3Wrapper {
	constructor(providerUrl) {
		this.web3 = new Web3(new Web3.providers.HttpProvider(providerUrl))
	}

	async getBlockNumber() {
		const blockNumber = await this.web3.eth.getBlockNumber();
		return Number.parseInt(blockNumber.toString());
	}

	getPastLogs(filter) {
		return this.web3.eth.getPastLogs(filter);
	}

	getBlock(blockNumber) {
		return this.web3.eth.getBlock(blockNumber);
	}

	encodeEventSignature(eventAbi) {
		return this.web3.eth.abi.encodeEventSignature(eventAbi);
	}

	decodeLog(eventAbiInputs, data, topics) {
		return this.web3.eth.abi.decodeLog(eventAbiInputs, data, topics);
	}
}

module.exports = { Web3Wrapper };