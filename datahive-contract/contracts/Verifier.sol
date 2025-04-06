// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title Verifier
 * @dev Manages verifiers, their reputation, and verification keys
 */
contract Verifier is Ownable, ReentrancyGuard {
    // Structs
    struct VerifierInfo {
        bool isActive;
        uint256 reputation;
        bytes publicKey;  // Optional verification key (could be used for off-chain verification)
        uint256 totalVerifications;
        uint256 successfulVerifications;
    }
    
    // State variables
    mapping(address => VerifierInfo) public verifiers;
    address[] public verifierList;
    address public contributionManager;
    
    uint256 public initialReputation = 100;
    uint256 public reputationIncrement = 5;
    uint256 public reputationDecrement = 10;
    
    // Events
    event VerifierAdded(address indexed verifier, bytes publicKey);
    event VerifierRemoved(address indexed verifier);
    event VerifierReputationUpdated(
        address indexed verifier, 
        uint256 oldReputation, 
        uint256 newReputation
    );
    event ContributionManagerUpdated(address contributionManager);
    
    // Modifiers
    modifier onlyContributionManager() {
        require(msg.sender == contributionManager, "Only contribution manager can call");
        _;
    }
    
    /**
     * @dev Set the ContributionManager contract address
     * @param _contributionManager Address of the ContributionManager contract
     */
    function setContributionManager(address _contributionManager) external onlyOwner {
        contributionManager = _contributionManager;
        emit ContributionManagerUpdated(_contributionManager);
    }
    
    /**
     * @dev Add a new verifier
     * @param _verifier Address of the verifier
     * @param _publicKey Optional verification key
     */
    function addVerifier(address _verifier, bytes memory _publicKey) external onlyOwner {
        require(_verifier != address(0), "Invalid verifier address");
        require(!verifiers[_verifier].isActive, "Verifier already exists");
        
        verifiers[_verifier] = VerifierInfo({
            isActive: true,
            reputation: initialReputation,
            publicKey: _publicKey,
            totalVerifications: 0,
            successfulVerifications: 0
        });
        
        verifierList.push(_verifier);
        
        emit VerifierAdded(_verifier, _publicKey);
    }
    
    /**
     * @dev Remove a verifier
     * @param _verifier Address of the verifier to remove
     */
    function removeVerifier(address _verifier) external onlyOwner {
        require(verifiers[_verifier].isActive, "Verifier does not exist");
        
        verifiers[_verifier].isActive = false;
        
        emit VerifierRemoved(_verifier);
    }
    
    /**
     * @dev Update a verifier's public key
     * @param _publicKey New public key
     */
    function updateVerifierPublicKey(bytes memory _publicKey) external {
        require(verifiers[msg.sender].isActive, "Not an active verifier");
        
        verifiers[msg.sender].publicKey = _publicKey;
        
        emit VerifierAdded(msg.sender, _publicKey);
    }
    
    /**
     * @dev Update verifier reputation (called by ContributionManager)
     * @param _verifier Address of the verifier
     * @param _positiveReview Whether the review is positive
     */
    function updateVerifierReputation(address _verifier, bool _positiveReview) 
        external 
        onlyContributionManager 
    {
        require(verifiers[_verifier].isActive, "Not an active verifier");
        
        VerifierInfo storage verifierInfo = verifiers[_verifier];
        uint256 oldReputation = verifierInfo.reputation;
        
        if (_positiveReview) {
            verifierInfo.reputation += reputationIncrement;
            verifierInfo.successfulVerifications++;
        } else {
            // Ensure reputation doesn't underflow
            if (verifierInfo.reputation > reputationDecrement) {
                verifierInfo.reputation -= reputationDecrement;
            } else {
                verifierInfo.reputation = 0;
            }
        }
        
        verifierInfo.totalVerifications++;
        
        emit VerifierReputationUpdated(_verifier, oldReputation, verifierInfo.reputation);
    }
    
    /**
     * @dev Set reputation parameters
     * @param _initialRep Initial reputation for new verifiers
     * @param _increment Reputation increase for positive reviews
     * @param _decrement Reputation decrease for negative reviews
     */
    function setReputationParameters(
        uint256 _initialRep,
        uint256 _increment,
        uint256 _decrement
    ) external onlyOwner {
        initialReputation = _initialRep;
        reputationIncrement = _increment;
        reputationDecrement = _decrement;
    }
    
    /**
     * @dev Check if an address is an active verifier
     * @param _verifier Address to check
     * @return Bool indicating if the address is an active verifier
     */
    function isVerifier(address _verifier) external view returns (bool) {
        return verifiers[_verifier].isActive;
    }
    
    /**
     * @dev Get a verifier's reputation
     * @param _verifier Address of the verifier
     * @return Verifier's current reputation
     */
    function getVerifierReputation(address _verifier) external view returns (uint256) {
        return verifiers[_verifier].reputation;
    }
    
    /**
     * @dev Get a verifier's public key
     * @param _verifier Address of the verifier
     * @return Verifier's public key
     */
    function getVerifierPublicKey(address _verifier) external view returns (bytes memory) {
        return verifiers[_verifier].publicKey;
    }
    
    /**
     * @dev Get all active verifiers
     * @return Array of verifier addresses
     */
    function getAllVerifiers() external view returns (address[] memory) {
        uint256 activeCount = 0;
        
        // Count active verifiers
        for (uint i = 0; i < verifierList.length; i++) {
            if (verifiers[verifierList[i]].isActive) {
                activeCount++;
            }
        }
        
        // Create and populate result array
        address[] memory activeVerifiers = new address[](activeCount);
        uint256 index = 0;
        
        for (uint i = 0; i < verifierList.length; i++) {
            if (verifiers[verifierList[i]].isActive) {
                activeVerifiers[index] = verifierList[i];
                index++;
            }
        }
        
        return activeVerifiers;
    }
    
    /**
     * @dev Get verifier statistics
     * @param _verifier Address of the verifier
     * @return totalVerifications Total number of verifications
     * @return successfulVerifications Number of successful verifications
     * @return reputation Current reputation score
     */
    function getVerifierStats(address _verifier) 
        external 
        view 
        returns (uint256 totalVerifications, uint256 successfulVerifications, uint256 reputation) 
    {
        VerifierInfo storage verifierInfo = verifiers[_verifier];
        return (
            verifierInfo.totalVerifications,
            verifierInfo.successfulVerifications,
            verifierInfo.reputation
        );
    }
} 