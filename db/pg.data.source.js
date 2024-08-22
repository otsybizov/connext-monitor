const Pool = require("pg").Pool;

function createClientPool(dbName) {
	return new Pool({
		user: process.env.DB_USER,
		password: process.env.DB_PASS,
		host: process.env.DB_HOST,
		port: process.env.DB_PORT,
		database: dbName,
	});
}

class PgDataSource {
	async init(networkId) {
		const dbName = process.env.DB_NAME;
		let db = createClientPool("postgres");
		const res = await db.query(
			`SELECT FROM pg_database WHERE datname = '${dbName}'`
		);
		if (res.rows.length === 0) {
			await db.query(`CREATE DATABASE ${dbName}`);
			await db.end();

			db = createClientPool(dbName);
			await db.query(
				`CREATE TABLE public.processed_blocks (
					networkId text NOT NULL,
					block integer NOT NULL,
					PRIMARY KEY(networkId)
				)`);

			await db.query(
				`CREATE TABLE public.transfers (
					transferId text NOT NULL,
					status text NOT NULL,
					timestamp integer NOT NULL,
          executionTimedOut boolean DEFAULT FALSE NOT NULL,
          reconciliationTimedOut boolean DEFAULT FALSE NOT NULL,
					PRIMARY KEY(transferId)
				)`);
		}

		await db.end();

		this.db = createClientPool(dbName);

		await this.db.query(`INSERT INTO processed_blocks (networkId, block) VALUES ('${networkId}', 1)
      ON CONFLICT (networkId) DO NOTHING`);
	}

	async stop() {
		if (this.db)
			await this.db.end();
	}

	// ============ Last scanned block ============

	async getLastBlockNumber(networkId) {
		const result = await this.db.query(`SELECT block FROM processed_blocks WHERE networkId = '${networkId}'`);
		if (result.rows.length > 0) {
			return result.rows[0].block;
		} else {
			return undefined;
		}
	}

	updateLastBlockNumber(networkId, blockNumber) {
		return this.db.query(`UPDATE processed_blocks SET block = ${blockNumber} WHERE networkId = '${networkId}'`);
	}

	// ============ Transfers ============

	addTransfer(transferId, status, timestamp) {
		return this.db.query(`INSERT INTO transfers (transferId, status, timestamp)
			VALUES ('${transferId}', '${status}', ${timestamp})`);
	}

	async getTransferStatus(transferId) {
		const result = await this.db.query(`SELECT status FROM transfers WHERE transferId = '${transferId}'`);
		if (result.rows.length > 0) {
			return result.rows[0].status;
		} else {
			return undefined;
		}
	}

	updateTransferStatus(transferId, status) {
		return this.db.query(`UPDATE transfers SET status = '${status}' WHERE transferId = '${transferId}'`);
	}

	async getTransferIds(status, maxTimestamp) {
		const result = await this.db.query(`SELECT transferId FROM transfers 
      WHERE (status = 'XCalled' OR status = '${status}') AND timestamp <= ${maxTimestamp}`);

		return result.rows;
	}

	markTransferExecutionTimedOut(maxTimestamp) {
		return this.db.query(`UPDATE transfers SET executionTimedOut = TRUE
			WHERE timestamp <= ${maxTimestamp} AND (status = 'XCalled' OR status = 'Reconciled')`);
	}

	markTransferReconciliationTimedOut(maxTimestamp) {
		return this.db.query(`UPDATE transfers SET reconciliationTimedOut = TRUE
			WHERE timestamp <= ${maxTimestamp} AND (status = 'XCalled' OR status = 'Executed')`);
	}
}

module.exports = { PgDataSource };
