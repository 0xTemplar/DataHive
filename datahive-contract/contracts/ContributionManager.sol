// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

interface ICampaignManager {
    function recordSubmission(uint256 _campaignId) external returns (uint256);
    function isAcceptingSubmissions(uint256 _campaignId) external view returns (bool);
    function getCampaignEncryptionPublicKey(uint256 _campaignId) external view returns (string memory);
    function getCampaignCreator(uint256 _campaignId) external view returns (address);
    function getRewardThreshold(uint256 _campaignId) external view returns (uint256);
}

interface IEscrowManager {
    function releaseReward(address _contributor, uint256 _amount) external;
}

interface IReputation {
    function recordSuccessfulContribution(address _user) external;
    function recordSuccessfulPayment(address _user) external;
    function recordSuccessfulCampaignContribution(address _campaignCreator) external;
    function ensureReputationStoreExists(address _user) external;
}

/**
 * @title ContributionManager
 * @dev Manages data submissions for campaigns with immediate verification and reward processing
 */
contract ContributionManager is Ownable, ReentrancyGuard {
    // Structs
    struct Contribution {
        uint256 id;
        uint256 campaignId;
        address contributor;
        string encryptedDataHash;     // Hash of the encrypted data
        string encryptedAESKey;       // AES key encrypted with campaign's RSA public key
        string metadataURI;           // URI pointing to additional metadata (e.g., IPFS hash)
        uint256 timestamp;
        uint256 score;                // Verification score
        bool qualified;               // Whether the score met the reward threshold
    }
    
    // State variables
    uint256 public contributionCount;
    mapping(uint256 => Contribution) public contributions;
    mapping(address => uint256[]) public contributorSubmissions;
    mapping(uint256 => uint256[]) public campaignSubmissions;
    mapping(bytes32 => bool) public submissionHashes;  // Track duplicate submissions
    mapping(address => mapping(uint256 => uint256)) public addressCampaignContributions; // Track contributions per campaign
    mapping(address => uint256) public addressTotalContributions;    // Track total contributions
    mapping(address => uint256) public addressQualifiedContributions; // Track qualified contributions
    
    ICampaignManager public campaignManager;
    IEscrowManager public escrowManager;
    IReputation public reputationContract;
    
    // Events
    event ContributionSubmitted(
        uint256 indexed contributionId,
        uint256 indexed campaignId,
        address indexed contributor,
        string encryptedDataHash,
        uint256 score,
        bool qualified,
        uint256 timestamp
    );
    event ReputationContractUpdated(address contractAddress);
    
    /**
     * @dev Constructor
     * @param _campaignManager Address of the CampaignManager contract
     * @param _escrowManager Address of the EscrowManager contract
     */
    constructor(address _campaignManager, address _escrowManager) {
        campaignManager = ICampaignManager(_campaignManager);
        escrowManager = IEscrowManager(_escrowManager);
    }
    
    /**
     * @dev Set the reputation contract address
     * @param _reputationContract Address of the Reputation contract
     */
    function setReputationContract(address _reputationContract) external onlyOwner {
        reputationContract = IReputation(_reputationContract);
        emit ReputationContractUpdated(_reputationContract);
    }
    
    /**
     * @dev Create a hash of contribution data to detect duplicates
     */
    function _createSubmissionHash(
        uint256 _campaignId, 
        address _contributor, 
        string memory _encryptedDataHash
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(_campaignId, _contributor, _encryptedDataHash));
    }
    
    /**
     * @dev Submit data to a campaign with verification score
     * @param _campaignId The campaign ID
     * @param _encryptedDataHash Hash of the encrypted data
     * @param _encryptedAESKey AES key encrypted with campaign's public key
     * @param _metadataURI Additional metadata URI
     * @param _score Verification score from off-chain verification
     */
    function submitContribution(
        uint256 _campaignId,
        string memory _encryptedDataHash,
        string memory _encryptedAESKey,
        string memory _metadataURI,
        uint256 _score
    ) external nonReentrant returns (uint256) {
        // Ensure contributor has a reputation store
        if (address(reputationContract) != address(0)) {
            reputationContract.ensureReputationStoreExists(msg.sender);
        }

        // Check campaign is accepting submissions
        require(
            campaignManager.isAcceptingSubmissions(_campaignId),
            "Campaign is not accepting submissions"
        );
        
        // Check for duplicate submissions
        bytes32 submissionHash = _createSubmissionHash(_campaignId, msg.sender, _encryptedDataHash);
        require(!submissionHashes[submissionHash], "Duplicate submission detected");
        submissionHashes[submissionHash] = true;
        
        // Check if score meets reward threshold
        uint256 rewardThreshold = campaignManager.getRewardThreshold(_campaignId);
        bool qualified = _score >= rewardThreshold;
        
        // Create contribution record
        uint256 contributionId = contributionCount;
        contributions[contributionId] = Contribution({
            id: contributionId,
            campaignId: _campaignId,
            contributor: msg.sender,
            encryptedDataHash: _encryptedDataHash,
            encryptedAESKey: _encryptedAESKey,
            metadataURI: _metadataURI,
            timestamp: block.timestamp,
            score: _score,
            qualified: qualified
        });
        
        contributionCount++;
        
        // Update contribution tracking
        contributorSubmissions[msg.sender].push(contributionId);
        campaignSubmissions[_campaignId].push(contributionId);
        addressTotalContributions[msg.sender]++;
        
        // Process reward if qualified
        if (qualified) {
            addressQualifiedContributions[msg.sender]++;
            addressCampaignContributions[msg.sender][_campaignId]++;

            // Record submission and get reward amount
            uint256 rewardAmount = campaignManager.recordSubmission(_campaignId);
            
            // Release reward
            escrowManager.releaseReward(msg.sender, rewardAmount);

            // Update reputations
            if (address(reputationContract) != address(0)) {
                reputationContract.recordSuccessfulContribution(msg.sender);
                reputationContract.recordSuccessfulPayment(msg.sender);
                
                address campaignCreator = campaignManager.getCampaignCreator(_campaignId);
                reputationContract.recordSuccessfulCampaignContribution(campaignCreator);
            }
        }
        
        // Always award base reputation for contributing
        if (address(reputationContract) != address(0)) {
            reputationContract.recordSuccessfulContribution(msg.sender);
        }
        
        emit ContributionSubmitted(
            contributionId,
            _campaignId,
            msg.sender,
            _encryptedDataHash,
            _score,
            qualified,
            block.timestamp
        );
        
        return contributionId;
    }
    
    /**
     * @dev Get contributions by a specific contributor
     * @param _contributor Address of the contributor
     * @return Array of contribution IDs
     */
    function getContributorSubmissions(address _contributor) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return contributorSubmissions[_contributor];
    }
    
    /**
     * @dev Get all submissions for a campaign
     * @param _campaignId The ID of the campaign
     * @return Array of contribution IDs
     */
    function getCampaignSubmissions(uint256 _campaignId) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return campaignSubmissions[_campaignId];
    }
    
    /**
     * @dev Get detailed information about a contribution
     * @param _contributionId The ID of the contribution
     * @return Contribution details
     */
    function getContributionDetails(uint256 _contributionId)
        external
        view
        returns (Contribution memory)
    {
        require(_contributionId < contributionCount, "Contribution does not exist");
        return contributions[_contributionId];
    }
    
    /**
     * @dev Checks if a contribution ID exists
     * @param _contributionId The ID to check
     * @return bool indicating if the contribution exists
     */
    function contributionExists(uint256 _contributionId) public view returns (bool) {
        return _contributionId < contributionCount;
    }

    /**
     * @dev Returns all stored contributions
     * @return Array of all contributions
     */
    function getContributionStore() external view returns (Contribution[] memory) {
        Contribution[] memory allContributions = new Contribution[](contributionCount);
        for (uint256 i = 0; i < contributionCount; i++) {
            allContributions[i] = contributions[i];
        }
        return allContributions;
    }

    /**
     * @dev Gets the number of contributions for an address in a specific campaign
     * @param _contributor The contributor's address
     * @param _campaignId The campaign ID
     * @return The number of rewarded contributions
     */
    function getAddressContributionCount(address _contributor, uint256 _campaignId) 
        external 
        view 
        returns (uint256) 
    {
        return addressCampaignContributions[_contributor][_campaignId];
    }

    /**
     * @dev Gets total contribution counts for an address across all campaigns
     * @param _contributor The contributor's address
     * @return totalSubmitted Total number of submissions
     * @return totalQualified Total number of qualified submissions
     */
    function getAddressTotalContributions(address _contributor)
        external
        view
        returns (uint256 totalSubmitted, uint256 totalQualified)
    {
        return (
            addressTotalContributions[_contributor],
            addressQualifiedContributions[_contributor]
        );
    }
} 