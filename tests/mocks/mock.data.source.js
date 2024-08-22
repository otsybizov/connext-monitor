
class MockDataSource {
	constructor() {
		this.lastBlockNumbers = new Map();
		this.transfers = new Map();
	}

	async init(networkId) {
	}

	async stop() {
	}

	// ============ Last scanned block ============

	async getLastBlockNumber(networkId) {
		return this.lastBlockNumbers.get(networkId);
	}

	updateLastBlockNumber(networkId, blockNumber) {
		this.lastBlockNumbers.set(networkId, blockNumber);
	}

	// ============ Transfers ============

	addTransfer(transferId, status, timestamp) {
		this.transfers.set(transferId, {
			status,
			timestamp,
			executionTimedOut: false,
			reconciliationTimedOut: false,
		});
	}

	async getTransferStatus(transferId) {
		return this.transfers.get(transferId).status;
	}

	updateTransferStatus(transferId, status) {
		this.transfers.get(transferId).status = status;
	}

	async getTransferIds(status, maxTimestamp) {
		return [];
	}

	markTransferExecutionTimedOut(maxTimestamp) {
	}

	markTransferReconciliationTimedOut(maxTimestamp) {
	}
}

module.exports = { MockDataSource };
