import { task } from 'hardhat/config';

task("deploy", "Deploy the oracle contract")
  .setAction(async (_, hre) => {
    const threshold = 1; // Number of app instances required to submit observations.

    // Deploy a new instance of the oracle contract with the threshold configuration.
    const oracle = await hre.ethers.deployContract("Oracle", [threshold], {});
    await oracle.waitForDeployment();

    console.log(`Oracle deployed to ${oracle.target}`);
    console.log(`Threshold: ${threshold}`);
  });

task("oracle-query", "Queries the oracle contract")
  .addPositionalParam("contractAddress", "The deployed contract address")
  .setAction(async ({ contractAddress }, { ethers }) => {
    const oracle = await ethers.getContractAt("Oracle", contractAddress);

    console.log(`Using oracle contract deployed at ${oracle.target}`);

    const threshold = await oracle.threshold();
    console.log(`Threshold: ${threshold}`);

    try {
      const [value, blockNum] = await oracle.getLastObservation();
      console.log(`Last observation: ${value}`);
      console.log(`Last update at:   ${blockNum}`);
    } catch {
      console.log(`No last observation available.`);
    }
  });

task("submit-observation", "Submits a random observation to the oracle contract")
  .addOptionalParam("contractAddress", "The deployed contract address", "0xcC5c94950A7Dbd58F66D53133d622599De6192c4")
  .addOptionalParam("value", "The observation value (defaults to random)")
  .setAction(async ({ contractAddress, value }, { ethers }) => {
    const oracle = await ethers.getContractAt("Oracle", contractAddress);

    console.log(`Using oracle contract deployed at ${oracle.target}`);

    // Generate random value if not provided (uint128 max is 2^128 - 1)
    const observationValue = value 
      ? BigInt(value)
      : BigInt(Math.floor(Math.random() * 1000000)); // Random value between 0 and 999,999

    console.log(`Submitting observation: ${observationValue}`);

    try {
      const tx = await oracle.submitObservation(observationValue);
      console.log(`Transaction submitted: ${tx.hash}`);
      
      const receipt = await tx.wait();
      console.log(`Transaction confirmed in block ${receipt.blockNumber}`);

      // Check if ObservationSubmitted event was emitted
      const events = receipt.logs.filter((log: any) => {
        try {
          const parsed = oracle.interface.parseLog(log);
          return parsed?.name === "ObservationSubmitted";
        } catch {
          return false;
        }
      });

      if (events.length > 0) {
        const parsed = oracle.interface.parseLog(events[0]);
        console.log(`\nObservation aggregated and submitted!`);
        console.log(`  Aggregated value: ${parsed?.args.value}`);
        console.log(`  Block: ${parsed?.args.block}`);
      } else {
        console.log(`\nObservation added to pending queue (threshold not yet reached)`);
      }
    } catch (error) {
      console.error(`Failed to submit observation:`, error);
    }
  });
