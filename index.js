require("dotenv").config();
const { ConnextMonitor } = require("./monitor/connext.monitor");
const { PgDataSource } = require("./db/pg.data.source");
const { EmailSender } = require("./messaging/email.sender");
const { Web3Wrapper } = require("./web3/web3.wrapper");
const chains = require("./data/chains.json");
const deployments = require("./data/deployments.json");
const { Events } = require("./monitor/blockchain.event.listener");

const monitor = new ConnextMonitor();
const dataSource = new PgDataSource();
const emailSender = new EmailSender();
const web3Factory = (providerUrl) => {
  return new Web3Wrapper(providerUrl);
};

const networks = [];
for (let networkId in deployments) {
  const connext = deployments[networkId][0].contracts.Connext;
  const chain = chains[networkId];
  if (connext && chain && chain.providers && chain.providers.length > 0)
    networks.push({
      contractAddress: connext.address,
      id: networkId,
      name: chain.name,
      providerUrl: chain.providers[0] });
}
if (networks.size === 0)
  throw "no networks configured";

const bridgeFacetAbi = deployments[1][0].contracts.BridgeFacet.abi;
const inboxFacetAbi = deployments[1][0].contracts.InboxFacet.abi;
const eventDecoders = CreateLogDecoders(
  [ bridgeFacetAbi, inboxFacetAbi ],
  [ Events.XCalled, Events.Executed, Events.Reconciled ],
  web3Factory("https://"));
const eventTopics = [];
for (let topic of eventDecoders.keys())
  eventTopics.push(topic);

monitor.start(web3Factory, dataSource, [ emailSender ], networks, eventDecoders, eventTopics);

process.on("SIGTERM", async () => {
  console.log("SIGTERM signal received.");
  await monitor.stop();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("SIGINT signal received.");
  await monitor.stop();
  process.exit(0);
});

function GetEventAbis(contractAbis, eventNames) {
  return contractAbis.reduce((eventAbis, contractAbi) => {
    return contractAbi.reduce((eventAbis, item) => {
      if (item.type === 'event' && eventNames.indexOf(item.name) >= 0)
        eventAbis.push(item);
      return eventAbis;
    }, eventAbis);
  }, []);
}

function CreateLogDecoders(contractAbis, eventNames, web3) {
  const eventAbis = GetEventAbis(contractAbis, eventNames);
  return eventAbis.reduce((logDecoders, eventAbi) => {
    const eventSignature = web3.encodeEventSignature(eventAbi);
    logDecoders.set(eventSignature, (data) => {
      let event = {
        name: eventAbi.name,
        address: data.address,
        transactionHash: data.transactionHash,
        logIndex: data.logIndex,
        blockNumber: data.blockNumber,
        data: web3.decodeLog(eventAbi.inputs, data.data, data.topics.slice(1)),
      };

      for (let i = 0; i < event.data.__length__; ++i)
        delete event.data[i];
      delete event.data.__length__;

      return event;
    });
    return logDecoders;
  }, new Map());
}
