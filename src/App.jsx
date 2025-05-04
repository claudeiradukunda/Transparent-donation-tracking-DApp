import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import './index.css';
import detectEthereumProvider from '@metamask/detect-provider';
import CharityTrust from '../artifacts/contracts/CharityTrust.sol/CharityTrust.json';

function App() {
  const [account, setAccount] = useState('');
  const [contract, setContract] = useState(null);
  const [donationAmount, setDonationAmount] = useState('');
  const [message, setMessage] = useState('');
  const [progress, setProgress] = useState({ current: 0, goal: 500 });
  const [loading, setLoading] = useState(false);
  const [donations, setDonations] = useState([]);
  const [newGoal, setNewGoal] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  // Add new state variables for beneficiary management
  const [beneficiaryAddress, setBeneficiaryAddress] = useState('');
  const [beneficiaryName, setBeneficiaryName] = useState('');
  const [distributionAmount, setDistributionAmount] = useState('');
  const [withdrawalHistory, setWithdrawalHistory] = useState([]);

  // Add this to your initializeEthereum function, right after setContract(charityContract);
  const checkIfAdmin = async () => {
    if (contract && account) {
      try {
        const owner = await contract.owner();
        setIsAdmin(owner.toLowerCase() === account.toLowerCase());
      } catch (error) {
        console.error('Error checking admin status:', error);
      }
    }
  };

  // Add this new function for handling withdrawals
  const handleWithdraw = async (e) => {
    e.preventDefault();
    if (!contract || !withdrawAmount || !isAdmin) return;

    try {
      setLoading(true);
      // First, add yourself as a beneficiary if not already added
      const tx1 = await contract.addBeneficiary(account, "Admin");
      await tx1.wait();
      
      // Then verify yourself as a beneficiary
      const tx2 = await contract.verifyBeneficiary(account);
      await tx2.wait();
      
      // Finally, distribute the funds
      const amountInWei = ethers.utils.parseEther(withdrawAmount.toString());
      const tx3 = await contract.distributeFunds(account, amountInWei);
      const receipt = await tx3.wait();
      
      // Add these lines to ensure everything is updated
      await updateProgress();
      await fetchDonationHistory();
      await fetchWithdrawalHistory();
      
      setWithdrawAmount('');
      alert('Withdrawal successful!');
    } catch (error) {
      console.error('Error withdrawing:', error);
      alert('Error withdrawing funds: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  // Add this effect to check admin status when account changes
  useEffect(() => {
    checkIfAdmin();
  }, [account, contract]);

  useEffect(() => {
    initializeEthereum();
  }, []);

  const initializeEthereum = async () => {
    try {
      console.log('Initializing Ethereum...');
      const provider = await detectEthereumProvider();
      
      if (provider) {
        console.log('Ethereum provider detected:', provider);
        
        // Check if we're on the correct network (Sepolia)
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        console.log('Connected to chain:', chainId);

        const ethersProvider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = ethersProvider.getSigner();
        const contractAddress = '0x5FbDB2315678afecb367f032d93F642f64180aa3';
        
        console.log('Creating contract instance...');
        const charityContract = new ethers.Contract(
          contractAddress,
          CharityTrust.abi,
          signer
        );

        setContract(charityContract);
        
        // Add event listeners
        charityContract.on('DonationReceived', (donor, amount, message) => {
          console.log('New donation received');
          updateProgress();
          fetchDonationHistory();
        });

        charityContract.on('FundsDistributed', (beneficiary, amount) => {
          console.log('Funds distributed');
          updateProgress();
          fetchWithdrawalHistory();
        });

        // Add account change listener
        window.ethereum.on('accountsChanged', async (accounts) => {
          console.log('Account changed:', accounts[0]);
          setAccount(accounts[0]);
          await Promise.all([
            updateProgress(),
            fetchDonationHistory(),
            fetchWithdrawalHistory(),
            checkIfAdmin()
          ]);
        });

        // Remove the nested useEffect from here
      } else {
        console.error('No Ethereum provider found');
        alert('Please install MetaMask to use this application');
      }
    } catch (error) {
      console.error('Error initializing ethereum:', error);
      alert('Error initializing application: ' + error.message);
    }
  };

  const connectWallet = async () => {
      try {
          // Check if MetaMask is installed
          if (typeof window.ethereum === 'undefined') {
              alert('Please install MetaMask to use this application');
              return;
          }
  
          try {
              // Simply request accounts - this will trigger MetaMask popup
              const accounts = await window.ethereum.request({
                  method: 'eth_requestAccounts'
              });
              
              if (accounts && accounts.length > 0) {
                  setAccount(accounts[0]);
                  await initializeEthereum();
              }
              
          } catch (error) {
              if (error.code === 4001) {
                  // User rejected the request
                  console.log('Please connect your wallet to continue');
              } else {
                  throw error;
              }
          }
          
      } catch (error) {
          console.error('Error connecting wallet:', error);
          alert('Error connecting to MetaMask: ' + error.message);
          setAccount(''); // Reset account if connection fails
      } finally {
          setLoading(false);
      }
  };

  const updateProgress = async () => {
    if (contract) {
      const [current, goal] = await contract.getDonationProgress();
      setProgress({
        current: ethers.utils.formatEther(current),
        goal: ethers.utils.formatEther(goal)
      });
    }
  };

  // Add this function to fetch donation history
  const fetchDonationHistory = async () => {
    if (contract) {
      try {
        const events = await contract.queryFilter('DonationReceived');
        const formattedDonations = await Promise.all(events.map(async (event) => {
          const block = await event.getBlock();
          return {
            donor: event.args.donor,
            amount: ethers.utils.formatEther(event.args.amount),
            message: event.args.message,
            timestamp: new Date(block.timestamp * 1000).toLocaleString()
          };
        }));
        setDonations(formattedDonations);
      } catch (error) {
        console.error('Error fetching donation history:', error);
      }
    }
  };

  // Add this function to fetch withdrawal history:
  const fetchWithdrawalHistory = async () => {
    if (contract) {
      try {
        const events = await contract.queryFilter('FundsDistributed');
        const formattedWithdrawals = await Promise.all(events.map(async (event) => {
          const block = await event.getBlock();
          return {
            beneficiary: event.args.beneficiary,
            amount: ethers.utils.formatEther(event.args.amount),
            timestamp: new Date(block.timestamp * 1000).toLocaleString()
          };
        }));
        setWithdrawalHistory(formattedWithdrawals);
      } catch (error) {
        console.error('Error fetching withdrawal history:', error);
      }
    }
  };

  // Add to useEffect
  useEffect(() => {
    initializeEthereum();
    return () => {
      if (contract) {
        // Remove all event listeners
        contract.removeAllListeners('DonationReceived');
        contract.removeAllListeners('FundsDistributed');
        if (window.ethereum) {
          window.ethereum.removeAllListeners('accountsChanged');
        }
      }
    };
  }, []);

  // Add to handleDonate success
  const handleDonate = async (e) => {
    e.preventDefault();
    if (!contract || !donationAmount) return;

    try {
      setLoading(true);
      console.log('Attempting donation of:', donationAmount, 'ETH');
      
      // Convert the donation amount to Wei
      const amountInWei = ethers.utils.parseEther(donationAmount.toString());
      console.log('Amount in Wei:', amountInWei.toString());

      const tx = await contract.donate(message, {
        value: amountInWei,
        gasLimit: 300000 // Add explicit gas limit
      });
      
      console.log('Transaction sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt);
      
      // Update progress and fetch donation history
      await Promise.all([
          updateProgress(),
          fetchDonationHistory()  // Add this line
      ]);
      
      setDonationAmount('');
      setMessage('');
      alert('Donation successful!');
    } catch (error) {
      console.error('Error donating:', error);
      alert('Error making donation: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
};

  const handleUpdateGoal = async (e) => {
    e.preventDefault();
    if (!contract || !newGoal) return;

    try {
      setLoading(true);
      const newGoalInWei = ethers.utils.parseEther(newGoal.toString());
      const tx = await contract.updateFundraisingGoal(newGoalInWei);
      await tx.wait();
      
      await updateProgress();
      setNewGoal('');
      alert('Fundraising goal updated successfully!');
    } catch (error) {
      console.error('Error updating goal:', error);
      alert('Error updating goal: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  // Add the beneficiary management functions here, before the return statement
  const handleAddBeneficiary = async (e) => {
    e.preventDefault();
    if (!contract || !beneficiaryAddress || !beneficiaryName || !isAdmin) return;

    try {
      setLoading(true);
      const tx = await contract.addBeneficiary(beneficiaryAddress, beneficiaryName);
      await tx.wait();
      
      setBeneficiaryAddress('');
      setBeneficiaryName('');
      alert('Beneficiary added successfully!');
    } catch (error) {
      console.error('Error adding beneficiary:', error);
      alert('Error adding beneficiary: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyBeneficiary = async (address) => {
    if (!contract || !isAdmin) return;

    try {
      setLoading(true);
      // First check if beneficiary exists
      const beneficiary = await contract.beneficiaries(address);
      if (!beneficiary.wallet) {
          throw new Error('Beneficiary does not exist');
      }
      
      const tx = await contract.verifyBeneficiary(address);
      await tx.wait();
      
      alert('Beneficiary verified successfully!');
    } catch (error) {
      console.error('Error verifying beneficiary:', error);
      alert('Error verifying beneficiary: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleDistributeFunds = async (e) => {
      e.preventDefault();
      if (!contract || !beneficiaryAddress || !distributionAmount || !isAdmin) return;
  
      try {
          setLoading(true);
          
          // First verify the beneficiary exists and is valid
          const beneficiary = await contract.beneficiaries(beneficiaryAddress);
          if (!beneficiary.wallet) {
              throw new Error('Invalid beneficiary address');
          }
          
          // Convert the amount to Wei
          const amountInWei = ethers.utils.parseEther(distributionAmount.toString());
          
          // Get contract balance to ensure sufficient funds
          const balance = await contract.provider.getBalance(contract.address);
          if (balance.lt(amountInWei)) {
              throw new Error('Insufficient contract balance for distribution');
          }
          
          // Distribute the funds
          const tx = await contract.distributeFunds(beneficiaryAddress, amountInWei);
          await tx.wait();
          
          // Update UI
          await Promise.all([
              updateProgress(),
              fetchWithdrawalHistory()
          ]);
          
          setDistributionAmount('');
          alert('Funds distributed successfully!');
      } catch (error) {
          console.error('Error distributing funds:', error);
          alert('Error distributing funds: ' + (error.message || 'Unknown error'));
      } finally {
          setLoading(false);
      }
  };

  // Add this new function to initialize read-only contract
  const initializeReadOnlyContract = async () => {
    try {
      const provider = new ethers.providers.JsonRpcProvider('http://localhost:8545');
      const contractAddress = '0x610178dA211FEF7D417bC0e6FeD39F05609AD788';
      const charityContract = new ethers.Contract(
        contractAddress,
        CharityTrust.abi,
        provider
      );
      return charityContract;
    } catch (error) {
      console.error('Error initializing read-only contract:', error);
      return null;
    }
  };

  // Modify the existing useEffect
  useEffect(() => {
    const init = async () => {
      // Initialize read-only contract for public data
      const readOnlyContract = await initializeReadOnlyContract();
      if (readOnlyContract) {
        // Fetch initial progress and donations
        const [current, goal] = await readOnlyContract.getDonationProgress();
        setProgress({
          current: ethers.utils.formatEther(current),
          goal: ethers.utils.formatEther(goal)
        });

        // Fetch both donation and withdrawal histories
        await Promise.all([
          fetchDonationHistory(),
          fetchWithdrawalHistory()
        ]);
      }
    };
    init();
  }, []);

  return (
    <div className="container">
      <header className="header">
        <h1>Transparent Donation Tracking DApp</h1>
      </header>

      <div className="card">
        <button className="button" onClick={connectWallet} disabled={loading}>
          {account ? `Connected: ${account.substring(0, 6)}...${account.substring(38)}` : 'Connect Wallet'}
        </button>
      </div>

      <div className="grid">
        <div className="card">
          <h2>Donation Progress</h2>
          <div className="progress-container">
            <div 
              className="progress-bar" 
              style={{ width: `${(progress.current / progress.goal) * 100}%` }}
            ></div>
          </div>
          <p>{progress.current} ETH of {progress.goal} ETH raised</p>
        </div>

        <div className="card">
          <h2>Make a Donation</h2>
          <form onSubmit={handleDonate} className="form-group">
            <label className="form-label">Amount (ETH)</label>
            <input
              type="number"
              className="form-input"
              value={donationAmount}
              onChange={(e) => setDonationAmount(e.target.value)}
              step="0.01"
            />
            <label className="form-label">Message</label>
            <input
              type="text"
              className="form-input"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <button type="submit" className="button" disabled={loading}>
              Donate
            </button>
          </form>
        </div>
      </div>

      {isAdmin && (
        <div className="admin-section">
          {/* Add Update Goal Form */}
          <div className="card">
            <h3>Update Fundraising Goal</h3>
            <form onSubmit={handleUpdateGoal} className="form-group">
              <label className="form-label">New Goal (ETH)</label>
              <input
                type="number"
                className="form-input"
                value={newGoal}
                onChange={(e) => setNewGoal(e.target.value)}
                step="0.01"
                placeholder="Enter new goal amount"
              />
              <button type="submit" className="button" disabled={loading}>
                Update Goal
              </button>
            </form>
          </div>

          {/* Add Beneficiary Form */}
          <div className="card">
            <h3>Add Beneficiary</h3>
            <form onSubmit={handleAddBeneficiary} className="form-group">
              <label className="form-label">Beneficiary Address</label>
              <input
                type="text"
                className="form-input"
                value={beneficiaryAddress}
                onChange={(e) => setBeneficiaryAddress(e.target.value)}
                placeholder="Enter beneficiary address"
              />
              <label className="form-label">Beneficiary Name</label>
              <input
                type="text"
                className="form-input"
                value={beneficiaryName}
                onChange={(e) => setBeneficiaryName(e.target.value)}
                placeholder="Enter beneficiary name"
              />
              <button type="submit" className="button" disabled={loading}>
                Add Beneficiary
              </button>
            </form>
          </div>

          {/* Verify Beneficiary Form */}
          <div className="card">
            <h3>Verify Beneficiary</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              handleVerifyBeneficiary(beneficiaryAddress);
            }} className="form-group">
              <label className="form-label">Beneficiary Address</label>
              <input
                type="text"
                className="form-input"
                value={beneficiaryAddress}
                onChange={(e) => setBeneficiaryAddress(e.target.value)}
                placeholder="Enter beneficiary address to verify"
              />
              <button type="submit" className="button" disabled={loading}>
                Verify Beneficiary
              </button>
            </form>
          </div>

          {/* Existing Distribute Funds Form */}
          <div className="card">
            <h3>Distribute Funds</h3>
            <form onSubmit={handleDistributeFunds} className="form-group">
                <label className="form-label">Beneficiary Address</label>
                <input
                    type="text"
                    className="form-input"
                    value={beneficiaryAddress}
                    onChange={(e) => setBeneficiaryAddress(e.target.value)}
                />
                <label className="form-label">Amount (ETH)</label>
                <input
                    type="number"
                    className="form-input"
                    value={distributionAmount}
                    onChange={(e) => setDistributionAmount(e.target.value)}
                    step="0.01"
                />
                <button type="submit" className="button" disabled={loading}>
                    Distribute Funds
                </button>
            </form>
        </div>
      </div>
      )}

      <div className="history-section">
        <div className="grid">
          {/* Beneficiary Distributions History */}
          <div className="card">
            <h2>Beneficiary Distributions History</h2>
            <div className="history-list">
              {withdrawalHistory.map((withdrawal, index) => (
                <div key={index} className="history-item">
                  <p><strong>Beneficiary:</strong> {withdrawal.beneficiary}</p>
                  <p><strong>Amount:</strong> {withdrawal.amount} ETH</p>
                  <p><strong>Time:</strong> {withdrawal.timestamp}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Donations History */}
          <div className="card">
            <h2>Donations History</h2>
            <div className="history-list">
              {donations.map((donation, index) => (
                <div key={index} className="history-item">
                  <p><strong>Donor:</strong> {donation.donor}</p>
                  <p><strong>Amount:</strong> {donation.amount} ETH</p>
                  <p><strong>Message:</strong> {donation.message}</p>
                  <p><strong>Time:</strong> {donation.timestamp}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
);
}

export default App;