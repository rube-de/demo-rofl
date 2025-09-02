import { ethers } from "hardhat";
import hre from "hardhat";

async function main() {
  const networkName = hre.network.name;
  const networkConfig = hre.network.config;
  
  console.log(`Polling events on network: ${networkName}`);
  console.log(`RPC URL: ${networkConfig.url}`);

  const contractAddress = "0xcC5c94950A7Dbd58F66D53133d622599De6192c4";
  if (!contractAddress) {
    throw new Error("ORACLE_CONTRACT_ADDRESS environment variable not set");
  }

  console.log(`Oracle contract address: ${contractAddress}`);

  const Oracle = await ethers.getContractFactory("Oracle");
  const oracle = Oracle.attach(contractAddress);

  console.log("Starting to poll for events and check last observation...\n");

  // Get current block number
  const currentBlock = await ethers.provider.getBlockNumber();
  console.log(`Current block: ${currentBlock}`);

  // Track shown events and last observation to avoid duplicates
  const shownEvents = new Set<string>();
  let lastObservationBlock = 0;

  // Poll for events every 2 seconds
  setInterval(async () => {
    try {
      const latestBlock = await ethers.provider.getBlockNumber();
      
      // Query for ObservationSubmitted events in recent blocks
      const filter = oracle.filters.ObservationSubmitted();
      const events = await oracle.queryFilter(filter, latestBlock - 10, latestBlock);
      
      // Filter out events that have already been shown
      const newEvents = events.filter(event => {
        if ('args' in event && 'transactionHash' in event && 'index' in event) {
          const eventId = `${event.transactionHash}-${event.index}`;
          if (shownEvents.has(eventId)) {
            return false;
          }
          shownEvents.add(eventId);
          return true;
        }
        return false;
      });
      
      if (newEvents.length > 0) {
        console.log(`\n[Block ${latestBlock}] Found ${newEvents.length} new event(s):`);
        
        for (const event of newEvents) {
          if ('args' in event) {
            const { value, block } = event.args as any;
            console.log(`  ObservationSubmitted (from event):`);
            console.log(`    - Value: ${value}`);
            console.log(`    - Block: ${block}`);
            console.log(`    - Tx Hash: ${event.transactionHash}`);
            console.log(`    - Block Number: ${event.blockNumber}`);
          }
        }
      }

      // Also check getLastObservation to catch any missed updates
      try {
        const [value, blockNum] = await oracle.getLastObservation();
        const observationBlock = Number(blockNum);
        
        if (observationBlock > lastObservationBlock) {
          console.log(`\n[Block ${latestBlock}] Last observation updated:`);
          console.log(`  Latest Observation (from contract state):`);
          console.log(`    - Value: ${value}`);
          console.log(`    - Block: ${blockNum}`);
          
          lastObservationBlock = observationBlock;
        }
      } catch (error: any) {
        // Observation might not be available (too old or none exists)
        if (error.message && !error.message.includes("No observation available")) {
          console.error("Error checking last observation:", error);
        }
      }
    } catch (error) {
      console.error("Error polling:", error);
    }
  }, 2000);

  // Keep the script running
  console.log("\nPolling for events and observations... Press Ctrl+C to stop\n");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});