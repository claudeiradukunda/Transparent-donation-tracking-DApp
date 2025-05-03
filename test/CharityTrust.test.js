const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CharityTrust", function () {
  let charityTrust;
  let owner;
  let addr1;
  let addr2;
  const initialGoal = ethers.utils.parseEther("1");

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    const CharityTrust = await ethers.getContractFactory("CharityTrust");
    charityTrust = await CharityTrust.deploy(initialGoal);
    await charityTrust.deployed();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await charityTrust.owner()).to.equal(owner.address);
    });

    it("Should set the correct initial fundraising goal", async function () {
      expect(await charityTrust.fundraisingGoal()).to.equal(initialGoal);
    });
  });

  describe("Donations", function () {
    it("Should accept donations and update total", async function () {
      const donationAmount = ethers.utils.parseEther("0.5");
      await charityTrust.connect(addr1).donate("Test donation", { value: donationAmount });
      
      expect(await charityTrust.totalDonations()).to.equal(donationAmount);
    });

    it("Should emit DonationReceived event", async function () {
      const donationAmount = ethers.utils.parseEther("0.5");
      const tx = await charityTrust.connect(addr1).donate("Test donation", { value: donationAmount });
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);
      
      await expect(tx)
        .to.emit(charityTrust, "DonationReceived")
        .withArgs(addr1.address, donationAmount, "Test donation", block.timestamp);
    });
  });
});