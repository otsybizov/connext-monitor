
const Events = {
	XCalled: "XCalled",
	Executed: "Executed",
	Reconciled: "Reconciled",
}

const TransferStatus = {
	XCalled: "XCalled",
	Executed: "Executed",
	Reconciled: "Reconciled",
	CompletedFast: "CompletedFast",
	CompletedSlow: "CompletedSlow",
}

class BlockchainEventListener {
	constructor(
			web3Factory,
			dataSource,
			messengers,
			pollInterval,
			blockBatch,
			contractAddress,
			networkId,
			networkName,
			providerUrl,
			eventDecoders,
			eventTopics) {
		this.web3Factory = web3Factory;
		this.dataSource = dataSource;
		this.messengers = messengers;
		this.pollInterval = pollInterval;
		this.blockBatch = blockBatch;
		this.contractAddress = contractAddress;
		this.networkId = networkId;
		this.networkName = networkName;
		this.providerUrl = providerUrl;
		this.eventDecoders = eventDecoders;
		this.eventTopics = eventTopics;
		this.running = false;
		this.readingBlocks = false;
	}

	async start() {
		try {
			if (this.running === true) {
				console.log(this.networkName + ": blockchain event listener is already running");
				return;
			}

			this.running = true;
			await this.dataSource.init(this.networkId);
      this.timerId = setInterval(async () => { await this.scanBlocks(); }, this.pollInterval);
			if (!this.web3)
				this.web3 = this.web3Factory(this.providerUrl);
			console.log(this.networkName + ": started blockchain event listener");

		} catch (error) {
			console.log(this.networkName + ": error starting blockchain event listener:", error);
			this.stop();
			setTimeout(() => { this.start() }, 500);
		}
	}

	stop() {
		this.running = false;
    clearInterval(this.timerId);
		console.log(this.networkName + ": blockchain event listener stopped");
	}

	async scanBlocks() {
		if (this.readingBlocks) {
			console.log(this.networkName + ": blocks reading is in progress, skipping new iteration");
			return;
		}

		this.readingBlocks = true;

		try {
			let fromBlock = await this.dataSource.getLastBlockNumber(this.networkId);
			let toBlock = await this.web3.getBlockNumber();
			if (fromBlock >= toBlock) {
				this.readingBlocks = false;
				console.log(this.networkName + ": to block", toBlock, "is not higher than from block", fromBlock);
				return;
			}

			do {
				await this.getEvents(fromBlock, toBlock);
				fromBlock = toBlock;
				toBlock = await this.web3.getBlockNumber();
			} while (fromBlock !== toBlock);

			await this.dataSource.updateLastBlockNumber(this.networkId, toBlock + 1);
		} catch (error) {
			console.log(this.networkName + ": error reading blockchain blocks:", error);
		}

		this.readingBlocks = false;
	}

	async getEvents(fromBlock, toBlock) {
		console.log(this.networkName + ": reading events from", fromBlock, "to", toBlock);
		if (fromBlock > toBlock)
			throw "invalid block number (" + this.networkName + ")";

		const totalBlocks = toBlock - fromBlock;
		const count = Math.ceil(totalBlocks / this.blockBatch);
		let startingBlock = fromBlock;

		for (let i = 0; i < count; ++i) {
			const fromRangeBlock = startingBlock;
			const toRangeBlock = (i === count - 1) ? toBlock : startingBlock + this.blockBatch;
			if (count > 1)
				console.log(this.networkName + ": reading block batch from", fromRangeBlock, "to", toRangeBlock);
			startingBlock = toRangeBlock + 1;

			const events = await this.web3.getPastLogs({
				fromBlock: fromRangeBlock,
				toBlock: toRangeBlock,
				address: [this.contractAddress],
				topics: [this.eventTopics] });

			for (let event of events)
				await this.handleEvent(event);

			await this.dataSource.updateLastBlockNumber(this.networkId, toRangeBlock + 1);
		}
	}

	async handleEvent(data) {
		console.log(this.networkName + ": got event:", data);
		const event = this.decodeEvent(data);
		if (!event || data.removed)
			return;

		console.log(this.networkName + ": decoded event:", event);

		const block = await this.web3.getBlock(event.blockNumber);
		const timestamp = block.timestamp * 1000;
		const latency = Date.now() - timestamp;

		let newStatus;
		if (event.name === Events.XCalled) {

			await this.dataSource.addTransfer(event.data.transferId, TransferStatus.XCalled, timestamp);
			newStatus = TransferStatus.XCalled;

		} else if (event.name === Events.Executed) {

			const status = await this.dataSource.getTransferStatus(event.data.transferId);
			newStatus = TransferStatus.Executed;
			if (status === TransferStatus.Reconciled)
				newStatus = TransferStatus.CompletedSlow;
			await this.dataSource.updateTransferStatus(event.data.transferId, newStatus);

		} else if (event.name === Events.Reconciled) {

			const status = await this.dataSource.getTransferStatus(event.data.transferId);
			newStatus = TransferStatus.Reconciled;
			if (status === TransferStatus.Executed)
				newStatus = TransferStatus.CompletedFast;
			await this.dataSource.updateTransferStatus(event.data.transferId, newStatus);

		}

		const topic = "transfer " + event.data.transferId + " status: " + newStatus;
		let message = JSON.stringify(event, undefined, 4);
		message += "\n\nEvent latency: " + latency + " ms";
		for (let messenger of this.messengers)
			messenger.send(topic, message);
	}

	decodeEvent(data) {
		const decoder = this.eventDecoders.get(data.topics[0]);
		if (decoder !== undefined)
			return decoder(data);
	}
}

module.exports = { BlockchainEventListener, Events, TransferStatus };