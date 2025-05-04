// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract CharityTrust is ReentrancyGuard, Pausable, Ownable {
    struct Donation {
        address donor;
        uint256 amount;
        uint256 timestamp;
        string message;
    }

    struct Beneficiary {
        address payable wallet;
        string name;
        bool isVerified;
    }

    uint256 public fundraisingGoal;
    uint256 public totalDonations;
    Donation[] public donations;
    mapping(address => Beneficiary) public beneficiaries;
    mapping(address => uint256) public beneficiaryBalances;
    mapping(address => uint256) public adminWithdrawals;  // Add this line to track admin withdrawals
    
    event DonationReceived(address indexed donor, uint256 amount, string message, uint256 timestamp);
    event FundraisingGoalUpdated(uint256 newGoal);
    event BeneficiaryAdded(address indexed beneficiary, string name);
    event BeneficiaryVerified(address indexed beneficiary);
    event FundsDistributed(address indexed beneficiary, uint256 amount);

    constructor(uint256 _fundraisingGoal) {
        fundraisingGoal = _fundraisingGoal;
    }

    function donate(string memory _message) external payable whenNotPaused {
        require(msg.value > 0, "Donation amount must be greater than 0");

        donations.push(Donation({
            donor: msg.sender,
            amount: msg.value,
            timestamp: block.timestamp,
            message: _message
        }));

        totalDonations += msg.value;

        emit DonationReceived(msg.sender, msg.value, _message, block.timestamp);
    }

    function updateFundraisingGoal(uint256 _newGoal) external onlyOwner {
        fundraisingGoal = _newGoal;
        emit FundraisingGoalUpdated(_newGoal);
    }

    // Remove the withdrawFunds function and add the following functions
    function addBeneficiary(address payable _beneficiary, string memory _name) external onlyOwner {
        require(_beneficiary != address(0), "Invalid beneficiary address");
        require(bytes(_name).length > 0, "Name cannot be empty");
        
        beneficiaries[_beneficiary] = Beneficiary({
            wallet: _beneficiary,
            name: _name,
            isVerified: false
        });
        
        emit BeneficiaryAdded(_beneficiary, _name);
    }

    function verifyBeneficiary(address _beneficiary) external onlyOwner {
        require(beneficiaries[_beneficiary].wallet != address(0), "Beneficiary does not exist");
        beneficiaries[_beneficiary].isVerified = true;
        emit BeneficiaryVerified(_beneficiary);
    }

    function distributeFunds(address payable _beneficiary, uint256 _amount) external onlyOwner nonReentrant {
        require(beneficiaries[_beneficiary].isVerified, "Beneficiary not verified");
        require(_amount <= address(this).balance, "Insufficient contract balance");
        require(_amount > 0, "Amount must be greater than 0");
        
        (bool success, ) = _beneficiary.call{value: _amount}("");
        require(success, "Transfer failed");
        
        // Update balances after successful transfer
        totalDonations -= _amount;
        beneficiaryBalances[_beneficiary] += _amount;
        adminWithdrawals[owner()] += _amount;
        
        emit FundsDistributed(_beneficiary, _amount);
    }

    // Add function to check admin's total withdrawals
    function getAdminWithdrawals() external view returns (uint256) {
        return adminWithdrawals[owner()];
    }

    // Add a function to check beneficiary's received amount
    function getBeneficiaryBalance(address _beneficiary) external view returns (uint256) {
        return beneficiaryBalances[_beneficiary];
    }

    function pauseDonations() external onlyOwner {
        _pause();
    }

    function resumeDonations() external onlyOwner {
        _unpause();
    }

    function getDonationsCount() external view returns (uint256) {
        return donations.length;
    }

    function getDonationProgress() external view returns (uint256, uint256) {
        return (totalDonations, fundraisingGoal);
    }
}