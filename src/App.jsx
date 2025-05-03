import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
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

      console.log('Requesting account access...');
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });
      console.log('Accounts:', accounts);
      
      setAccount(accounts[0]);
      // Initialize contract after connecting
      await initializeEthereum();
    } catch (error) {
      console.error('Error connecting wallet:', error);
      alert('Error connecting to MetaMask: ' + error.message);
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
      const amountInWei = ethers.utils.parseEther(distributionAmount.toString());
      const tx = await contract.distributeFunds(beneficiaryAddress, amountInWei);
      await tx.wait();
      
      await Promise.all([
        updateProgress(),
        fetchWithdrawalHistory()  // Add this line
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
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">Transparent Donation Tracking DApp</h1>
      
      {/* Show progress before wallet connection */}
      <div className="mb-8">
        <div className="mt-4">
          <p>Progress: {progress.current} ETH / {progress.goal} ETH</p>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full"
              style={{
                width: `${(progress.current / progress.goal) * 100}%`
              }}
            ></div>
          </div>
        </div>
      </div>

      {!account ? (
        <button
          onClick={connectWallet}
          className="bg-blue-500 text-white px-4 py-2 rounded mt-8"
        >
          Connect Wallet to Donate
        </button>
      ) : (
        <>
          <div className="mb-8">
            <p>Connected Account: {account}</p>
          </div>

          <form onSubmit={handleDonate} className="max-w-md">
            <div className="mb-4">
              <label className="block mb-2">Donation Amount (ETH)</label>
              <input
                type="number"
                step="0.01"
                value={donationAmount}
                onChange={(e) => setDonationAmount(e.target.value)}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            
            <div className="mb-4">
              <label className="block mb-2">Message (Optional)</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full p-2 border rounded"
                rows="3"
              ></textarea>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="bg-green-500 text-white px-4 py-2 rounded disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Donate'}
            </button>
          </form>

          {isAdmin && (
            <>
              <div className="mt-8">
                <h2 className="text-2xl font-bold mb-4">Update Fundraising Goal</h2>
                <form onSubmit={handleUpdateGoal} className="max-w-md">
                  <div className="mb-4">
                    <label className="block mb-2">New Goal (ETH)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newGoal}
                      onChange={(e) => setNewGoal(e.target.value)}
                      className="w-full p-2 border rounded"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
                  >
                    {loading ? 'Processing...' : 'Update Goal'}
                  </button>
                </form>
              </div>

              <div className="mt-8">
                <h2 className="text-2xl font-bold mb-4">Withdraw Funds (Admin Only)</h2>
                <form onSubmit={handleWithdraw} className="max-w-md">
                  <div className="mb-4">
                    <label className="block mb-2">Withdrawal Amount (ETH)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      className="w-full p-2 border rounded"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-red-500 text-white px-4 py-2 rounded disabled:opacity-50"
                  >
                    {loading ? 'Processing...' : 'Withdraw'}
                  </button>
                </form>
              </div>

              <div className="mt-8">
                <h2 className="text-2xl font-bold mb-4">Manage Beneficiaries (Admin Only)</h2>
                <form onSubmit={handleAddBeneficiary} className="max-w-md mb-8">
                  <div className="mb-4">
                    <label className="block mb-2">Beneficiary Address</label>
                    <input
                      type="text"
                      value={beneficiaryAddress}
                      onChange={(e) => setBeneficiaryAddress(e.target.value)}
                      className="w-full p-2 border rounded"
                      required
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block mb-2">Beneficiary Name</label>
                    <input
                      type="text"
                      value={beneficiaryName}
                      onChange={(e) => setBeneficiaryName(e.target.value)}
                      className="w-full p-2 border rounded"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
                  >
                    {loading ? 'Processing...' : 'Add Beneficiary'}
                  </button>
                </form>

                <form onSubmit={handleDistributeFunds} className="max-w-md">
                  <div className="mb-4">
                    <label className="block mb-2">Distribution Amount (ETH)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={distributionAmount}
                      onChange={(e) => setDistributionAmount(e.target.value)}
                      className="w-full p-2 border rounded"
                      required
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block mb-2">Beneficiary Address</label>
                    <input
                      type="text"
                      value={beneficiaryAddress}
                      onChange={(e) => setBeneficiaryAddress(e.target.value)}
                      className="w-full p-2 border rounded"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-green-500 text-white px-4 py-2 rounded disabled:opacity-50 mr-2"
                  >
                    {loading ? 'Processing...' : 'Distribute Funds'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleVerifyBeneficiary(beneficiaryAddress)}
                    disabled={loading}
                    className="bg-yellow-500 text-white px-4 py-2 rounded disabled:opacity-50"
                  >
                    {loading ? 'Processing...' : 'Verify Beneficiary'}
                  </button>
                </form>
              </div>
            </>
          )}
        </>
      )}

      {/* Move donation history to bottom */}
      {/* Recent Donations section */}
      <div className="mt-12 border-t pt-8">
        <h2 className="text-2xl font-bold mb-4">Recent Donations</h2>
        <div className="space-y-4">
          {donations.map((donation, index) => (
            <div key={index} className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">From: {donation.donor}</p>
              <p className="font-bold">{donation.amount} ETH</p>
              {donation.message && (
                <p className="text-gray-700 mt-2">"{donation.message}"</p>
              )}
              <p className="text-sm text-gray-500">{donation.timestamp}</p>
            </div>
          ))}
        </div>
      </div>

      {/* After the Recent Donations section */}
      <div className="mt-12 border-t pt-8">
        <h2 className="text-2xl font-bold mb-4">Distribution History</h2>
        <div className="space-y-4">
          {withdrawalHistory.map((withdrawal, index) => (
            <div key={index} className="bg-gray-50 p-4 rounded-lg shadow">
              <p className="text-sm text-gray-600">Beneficiary: {withdrawal.beneficiary}</p>
              <p className="font-bold text-green-600">{withdrawal.amount} ETH</p>
              <p className="text-sm text-gray-500">Distributed on: {withdrawal.timestamp}</p>
            </div>
          ))}
          {withdrawalHistory.length === 0 && (
            <p className="text-gray-500 italic">No distributions have been made yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;