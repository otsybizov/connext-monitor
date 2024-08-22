const { BlockchainEventListener, TransferStatus } = require("./blockchain.event.listener");

class ConnextMonitor {
	async start(web3Factory, dataSource, messengers, networks, eventDecoders, eventTopics) {
		this.dataSource = dataSource;
		this.messengers = messengers;
		this.executionTimeout = Number.parseInt(process.env.EXECUTION_TIMEOUT_MILLISECONDS);
		this.reconciliationTimeout = Number.parseInt(process.env.RECONCILIATION_TIMEOUT_MILLISECONDS);

		const pollInterval = Number.parseInt(process.env.POLL_INTERVAL_MILLISECONDS);
		const blockBatch = Number.parseInt(process.env.BLOCK_SCAN_BATCH_SIZE);

		this.listeners = [];
		for (let network of networks) {
			const listener = new BlockchainEventListener(
				web3Factory,
				dataSource,
				messengers,
				pollInterval,
				blockBatch,
				network.contractAddress,
				network.id,
				network.name,
				network.providerUrl,
				eventDecoders,
				eventTopics);
			this.listeners.push(listener);
			await listener.start();
		}

		this.checkTransferExecutionTimerId = setInterval(async () => { await this.checkForTimedOutExecutions(); }, 60000);
		this.checkTransferReconciliationTimerId = setInterval(async () => { await this.checkForTimedOutReconciliations(); }, 60000);
	}

	async stop() {
		clearInterval(this.checkTransferExecutionTimerId);
		clearInterval(this.checkTransferReconciliationTimerId);

    for (let listener of this.listeners)
      await listener.stop();

    if (this.dataSource)
      await this.dataSource.stop();
	}

	async checkForTimedOutExecutions() {
		const maxTimestamp = Date.now() - this.executionTimeout;
		const transferIds = await this.dataSource.getTransferIds(TransferStatus.Reconciled, maxTimestamp);
		const topic = "Max wait time for transfer execution is breached";
		const message = JSON.stringify(transferIds, undefined, 4);
		for (let messenger of this.messengers)
			messenger.send(topic, message);
	}

	async checkForTimedOutReconciliations() {
		const maxTimestamp = Date.now() - this.reconciliationTimeout;
		const transferIds = await this.dataSource.getTransferIds(TransferStatus.Executed, maxTimestamp);
		const topic = "Max wait time for transfer reconciliation is breached";
		const message = JSON.stringify(transferIds, undefined, 4);
		for (let messenger of this.messengers)
			messenger.send(topic, message);
	}
}

module.exports = { ConnextMonitor };