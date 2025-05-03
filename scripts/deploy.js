const { ethers } = require("hardhat");

async function main() {
  const CharityTrust = await ethers.getContractFactory("CharityTrust");
  const initialGoal = ethers.utils.parseEther("1"); // Set initial goal to 1 ETH
  const charityTrust = await CharityTrust.deploy(initialGoal);
  await charityTrust.deployed();

  console.log("CharityTrust deployed to:", charityTrust.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });