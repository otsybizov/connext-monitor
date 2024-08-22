require("dotenv").config({ path: __dirname + "/.env" });
const { expect } = require("chai");
const { ConnextMonitor } = require("../monitor/connext.monitor");
const { MockDataSource } = require("./mocks/mock.data.source");
const { MockMessageSender } = require("./mocks/mock.message.sender");
const { MockWeb3 } = require("./mocks/mock.web3");
const { MockEventDecoder } = require("./mocks/mock.event.decoder");
const { Events, TransferStatus } = require("../monitor/blockchain.event.listener");

const delay = async (timeout) => {
	return new Promise(resolve => setTimeout(resolve, timeout));
}

describe("Connext monitor service tests", function () {
  it("Transfer complete fast", async function () {
	  const monitor = new ConnextMonitor();
	  const dataSource = new MockDataSource();
	  const messageSender = new MockMessageSender();
		const web3 = new MockWeb3();
	  const web3Factory = () => {
		  return web3;
	  };
		const eventDecoder = new MockEventDecoder();

	  const networks = [
		  {
				contractAddress: "contractAddress1",
			  id: "1",
			  name: "network1",
			  providerUrl: "",
		  },
		  {
				contractAddress: "contractAddress2",
			  id: "2",
			  name: "network2",
			  providerUrl: "",
		  },
	  ];

	  web3.setLogs(5,[
		  {
				name: Events.XCalled,
			  blockNumber: 2,
			  data: {
				  transferId: "transfer1"
			  },
			  topics: [ "" ],
		  },
		  {
				name: Events.Executed,
			  blockNumber: 3,
			  data: {
				  transferId: "transfer1"
			  },
			  topics: [ "" ],
		  },
		  {
				name: Events.Reconciled,
			  blockNumber: 4,
			  data: {
				  transferId: "transfer1"
			  },
			  topics: [ "" ],
		  },
	  ]);

	  dataSource.updateLastBlockNumber("1", 1);
	  dataSource.updateLastBlockNumber("2", 1);

	  await monitor.start(web3Factory, dataSource, [ messageSender ], networks, eventDecoder, []);
	  await delay(10);
	  await monitor.stop();

    expect(messageSender.messages.length).to.equal(3);
    expect(await dataSource.getTransferStatus("transfer1")).to.equal(TransferStatus.CompletedFast);
  });
});