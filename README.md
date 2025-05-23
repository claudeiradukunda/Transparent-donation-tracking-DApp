# Transparent Donation Tracking DApp
##  Introduction
Transparent Donation Tracking DApp is a blockchain application designed to increase trust in charitable giving by making all donations and spending activities fully visible on the Ethereum blockchain. This promotes integrity and accountability among fundraisers and charitable organizations.
##  Project Objective
To create a DApp that ensures full transparency, traceability, and accountability of donated funds using smart contracts and blockchain. Donors can independently verify where their funds go and how they are used.
##  Problem Statement
Traditional centralized donation platforms face several issues:
# Lack of transparent reporting
# Possibility of fund misuse
# No verifiable proof of donation allocations
# Donors cannot track how their contributions are being used
##  Proposed Solution
## This DApp solves these issues by:
Recording each donation permanently on the Ethereum blockchain
Displaying donation history (amounts, timestamps, and donor messages)
Publicly tracking progress toward fundraising goals
Allowing only the admin to send funds to verified beneficiaries
Using open-source smart contracts for transparency

##  Key Features
*Transparent Donation Records*  Stores donor address, amount, timestamp, and message 
 **Fundraising Goal Setting**  Admin can set and update a fundraising goal 
 **Progress Tracking**  Users can view how much has been raised 
 **Admin-Controlled Fund Distribution**  Only admin can withdraw funds to verified addresses 
**Security-focused Smart Contract** Built with Solidity best practices and OpenZeppelin libraries 
**User-Friendly Web3 Frontend**  Built with React.js and ethers.js 
 **MetaMask Integration**  Enables wallet connection and secure transactions 
## Technical Stack

# Component        #Technology 
Blockchain              Ethereum (Hardhat for development) 
Smart Contracts         Solidity 
Frontend                React.js 
 Wallet Integration     MetaMask + Ethers.js 
 Deployment/Testing     Hardhat
UI Design               Tailwind CSS + Bootstrap 

##  How to Run Locally
1. **Clone the repository:**
   ```bash
   git clone https://github.com/claudeiradukunda/Transparent-donation-tracking-DApp/
   cd transparent-donation-dapp
## Install dependencies:
bash
npm install
Compile and deploy contracts (using Hardhat):
npx hardhat compile
npx hardhat node
npx hardhat run scripts/deploy.js --network localhost
# Run the frontend:

cd frontend
npm install
npm start
Connect MetaMask:
Import account from Hardhat or connect your test wallet
Select the correct network (localhost or testnet)

# Conclusion
Transparent Donation Tracking DApp demonstrates how decentralized technologies can build trust and improve transparency in charitable giving. Through smart contracts, real-time updates, and secure fund handling, this DApp shows how blockchain can solve real-world problems in the donation space.

