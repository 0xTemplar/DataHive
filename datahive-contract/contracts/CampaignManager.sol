// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title CampaignManager
 * @dev Manages data collection campaigns for AI training
 */
contract CampaignManager is Ownable, ReentrancyGuard {
    // Structs
    struct Campaign {
        uint256 id;
        string campaignIdString;    // Human-readable campaign identifier
        address creator;
        string title;
        string description;
        string dataRequirements;
        string[] qualityCriteria;
        uint256 unitPrice;          // Reward per submission
        uint256 totalBudget;
        uint256 remainingBudget;
        uint256 maxSubmissions;
        uint256 currentSubmissions;
        uint256 startTime;
        uint256 expiration;         // End time
        bool active;
        string metadataURI;         // Additional campaign metadata
        uint256 platformFee;        // Fee percentage (in basis points, e.g., 250 = 2.5%)
        string encryptionPublicKey;  // RSA public key for data encryption
        uint256 rewardThreshold;    // Minimum score needed to qualify for reward
    }

    // Campaign creation parameters struct to avoid stack too deep errors
    struct CampaignParams {
        string campaignIdString;    // Human-readable campaign identifier
        string title;
        string description;
        string dataRequirements;
        string[] qualityCriteria;
        uint256 unitPrice;
        uint256 totalBudget;
        uint256 maxSubmissions;
        uint256 startTime;
        uint256 expiration;
        string metadataURI;
        uint256 platformFee;
        string encryptionPublicKey;
        uint256 rewardThreshold;    // Added reward threshold parameter
    }

    // State variables
    uint256 public campaignCount;
    uint256 public activeCampaignCount;
    mapping(uint256 => Campaign) public campaigns;
    mapping(string => bool) public campaignIdStringExists;  // Track used campaign ID strings
    mapping(string => uint256) public campaignIdStringToId; // Map string ID to numeric ID
    mapping(address => uint256[]) public ownerCampaigns;   // Track campaigns by owner
    mapping(address => uint256) public ownerActiveCampaigns; // Track active campaigns by owner
    mapping(address => uint256) public ownerTotalSpent;    // Track total budget spent by owner
    mapping(address => uint256) public contributorTotalEarned; // Track total earnings by contributor
    mapping(address => string) public usernames;           // User-friendly names
    mapping(address => uint256) public usernameEditCount;  // Track username changes
    mapping(string => bool) public usernameExists;         // Track taken usernames
    
    address public contributionsContract;
    address public escrowContract;
    IERC20 public rewardToken;
    uint256 public defaultPlatformFee = 250; // Default 2.5% platform fee (250 basis points)
    uint256 public constant MAX_USERNAME_EDITS = 2;
    uint256 public constant MAX_USERNAME_LENGTH = 32;
    
    // Events
    event CampaignCreated(
        uint256 indexed campaignId,
        string campaignIdString,
        address indexed creator,
        string title,
        uint256 budget,
        uint256 startTime,
        uint256 expiration,
        string metadataURI
    );
    event CampaignUpdated(uint256 indexed campaignId);
    event CampaignActivated(uint256 indexed campaignId);
    event CampaignDeactivated(uint256 indexed campaignId);
    event CampaignCancelled(uint256 indexed campaignId, uint256 refundAmount);
    event ContributionsContractUpdated(address contractAddress);
    event EscrowContractUpdated(address contractAddress);
    event DefaultPlatformFeeUpdated(uint256 newFee);
    event UsernameSet(address indexed user, string username);
    event UsernameEdited(address indexed user, string oldUsername, string newUsername);
    event ContributorRewarded(address indexed contributor, uint256 amount);

    // Modifiers
    modifier onlyContributionsContract() {
        require(
            msg.sender == contributionsContract,
            "Only contributions contract can call this function"
        );
        _;
    }

    modifier onlyEscrowContract() {
        require(
            msg.sender == escrowContract,
            "Only escrow contract can call this function"
        );
        _;
    }

    modifier onlyCampaignCreator(uint256 _campaignId) {
        require(
            campaigns[_campaignId].creator == msg.sender,
            "Only campaign creator can call this function"
        );
        _;
    }

    modifier campaignExists(uint256 _campaignId) {
        require(_campaignId < campaignCount, "Campaign does not exist");
        _;
    }

    /**
     * @dev Constructor to initialize the contract
     * @param _rewardToken The ERC20 token used for rewards
     */
    constructor(IERC20 _rewardToken) {
        rewardToken = _rewardToken;
    }

    /**
     * @dev Sets the address of the Contributions contract
     * @param _contractAddress The address of the Contributions contract
     */
    function setContributionsContract(address _contractAddress) external onlyOwner {
        contributionsContract = _contractAddress;
        emit ContributionsContractUpdated(_contractAddress);
    }

    /**
     * @dev Sets the address of the Escrow contract
     * @param _contractAddress The address of the Escrow contract
     */
    function setEscrowContract(address _contractAddress) external onlyOwner {
        escrowContract = _contractAddress;
        emit EscrowContractUpdated(_contractAddress);
    }

    /**
     * @dev Sets the default platform fee
     * @param _fee New fee in basis points (e.g., 250 = 2.5%)
     */
    function setDefaultPlatformFee(uint256 _fee) external onlyOwner {
        require(_fee <= 1000, "Fee cannot exceed 10%"); // Max 10% fee
        defaultPlatformFee = _fee;
        emit DefaultPlatformFeeUpdated(_fee);
    }

    /**
     * @dev Creates a new data collection campaign
     * @param _params Struct containing all campaign parameters
     * @return campaignId The ID of the created campaign
     */
    function createCampaign(CampaignParams memory _params) 
        external 
        nonReentrant 
        returns (uint256) 
    {
        require(_params.expiration > _params.startTime, "Expiration must be after start time");
        require(_params.totalBudget > 0, "Budget must be greater than 0");
        require(_params.unitPrice > 0, "Unit price must be greater than 0");
        require(bytes(_params.encryptionPublicKey).length > 0, "Public key cannot be empty");
        require(bytes(_params.campaignIdString).length > 0, "Campaign ID string cannot be empty");
        require(!campaignIdStringExists[_params.campaignIdString], "Campaign ID string already exists");
        require(_params.rewardThreshold > 0, "Reward threshold must be greater than 0");
        require(_params.rewardThreshold <= 100, "Reward threshold cannot exceed 100");
        
        // Use default platform fee if none specified
        uint256 platformFee = _params.platformFee > 0 ? _params.platformFee : defaultPlatformFee;
        require(platformFee <= 1000, "Platform fee cannot exceed 10%");
        
        // Calculate total amount to transfer (including platform fee)
        uint256 totalAmount = _params.totalBudget;
        
        // Transfer tokens from creator to escrow
        require(
            rewardToken.transferFrom(msg.sender, escrowContract, totalAmount),
            "Token transfer failed"
        );

        // Create campaign
        uint256 campaignId = campaignCount;
        campaigns[campaignId] = Campaign({
            id: campaignId,
            campaignIdString: _params.campaignIdString,
            creator: msg.sender,
            title: _params.title,
            description: _params.description,
            dataRequirements: _params.dataRequirements,
            qualityCriteria: _params.qualityCriteria,
            unitPrice: _params.unitPrice,
            totalBudget: _params.totalBudget,
            remainingBudget: _params.totalBudget,
            maxSubmissions: _params.maxSubmissions,
            currentSubmissions: 0,
            startTime: _params.startTime,
            expiration: _params.expiration,
            active: true,
            metadataURI: _params.metadataURI,
            platformFee: platformFee,
            encryptionPublicKey: _params.encryptionPublicKey,
            rewardThreshold: _params.rewardThreshold
        });

        // Register the campaign ID string
        campaignIdStringExists[_params.campaignIdString] = true;
        campaignIdStringToId[_params.campaignIdString] = campaignId;

        // Update campaign tracking
        campaignCount++;
        activeCampaignCount++;
        ownerCampaigns[msg.sender].push(campaignId);
        ownerActiveCampaigns[msg.sender]++;
        ownerTotalSpent[msg.sender] += _params.totalBudget;

        emit CampaignCreated(
            campaignId,
            _params.campaignIdString,
            msg.sender,
            _params.title,
            _params.totalBudget,
            _params.startTime,
            _params.expiration,
            _params.metadataURI
        );

        return campaignId;
    }

    /**
     * @dev Updates an existing campaign's details
     * @param _campaignId The ID of the campaign to update
     * @param _title Updated campaign title
     * @param _description Updated campaign description
     * @param _dataRequirements Updated data requirements
     * @param _qualityCriteria Updated quality criteria
     * @param _expiration Updated expiration time
     * @param _metadataURI Updated metadata URI
     * @param _encryptionPublicKey Updated RSA public key (if needed)
     */
    function updateCampaign(
        uint256 _campaignId,
        string memory _title,
        string memory _description,
        string memory _dataRequirements,
        string[] memory _qualityCriteria,
        uint256 _expiration,
        string memory _metadataURI,
        string memory _encryptionPublicKey
    ) external campaignExists(_campaignId) onlyCampaignCreator(_campaignId) {
        Campaign storage campaign = campaigns[_campaignId];
        
        require(campaign.active, "Campaign is not active");
        require(block.timestamp < campaign.expiration, "Campaign has ended");
        require(_expiration > block.timestamp, "Expiration must be in the future");

        campaign.title = _title;
        campaign.description = _description;
        campaign.dataRequirements = _dataRequirements;
        campaign.qualityCriteria = _qualityCriteria;
        campaign.expiration = _expiration;
        campaign.metadataURI = _metadataURI;
        
        // Only update encryption public key if a new one is provided
        if (bytes(_encryptionPublicKey).length > 0) {
            campaign.encryptionPublicKey = _encryptionPublicKey;
        }

        emit CampaignUpdated(_campaignId);
    }

    /**
     * @dev Get campaign numeric ID from campaign ID string
     * @param _campaignIdString The string identifier of the campaign
     * @return The numeric ID of the campaign
     */
    function getCampaignIdFromString(string memory _campaignIdString) 
        external 
        view 
        returns (uint256) 
    {
        require(campaignIdStringExists[_campaignIdString], "Campaign ID string does not exist");
        return campaignIdStringToId[_campaignIdString];
    }

    /**
     * @dev Get campaign details by campaign ID string
     * @param _campaignIdString The string identifier of the campaign
     * @return Campaign details
     */
    function getCampaignDetailsByString(string memory _campaignIdString) 
        external 
        view 
        returns (Campaign memory) 
    {
        require(campaignIdStringExists[_campaignIdString], "Campaign ID string does not exist");
        uint256 campaignId = campaignIdStringToId[_campaignIdString];
        return campaigns[campaignId];
    }

    /**
     * @dev Activates a campaign
     * @param _campaignId The ID of the campaign to activate
     */
    function activateCampaign(uint256 _campaignId) 
        external 
        campaignExists(_campaignId) 
        onlyCampaignCreator(_campaignId) 
    {
        Campaign storage campaign = campaigns[_campaignId];
        require(!campaign.active, "Campaign is already active");
        require(block.timestamp < campaign.expiration, "Campaign has ended");

        campaign.active = true;
        emit CampaignActivated(_campaignId);
    }

    /**
     * @dev Deactivates a campaign
     * @param _campaignId The ID of the campaign to deactivate
     */
    function deactivateCampaign(uint256 _campaignId) 
        external 
        campaignExists(_campaignId) 
        onlyCampaignCreator(_campaignId) 
    {
        Campaign storage campaign = campaigns[_campaignId];
        require(campaign.active, "Campaign is already inactive");

        campaign.active = false;
        emit CampaignDeactivated(_campaignId);
    }

    /**
     * @dev Records a successful submission to a campaign (called by Contributions contract)
     * @param _campaignId The ID of the campaign
     * @return rewardAmount The reward amount for the submission
     */
    function recordSubmission(uint256 _campaignId) 
        external 
        onlyContributionsContract
        campaignExists(_campaignId)
        returns (uint256)
    {
        Campaign storage campaign = campaigns[_campaignId];
        
        require(campaign.active, "Campaign is not active");
        require(block.timestamp >= campaign.startTime, "Campaign has not started");
        require(block.timestamp <= campaign.expiration, "Campaign has ended");
        require(campaign.currentSubmissions < campaign.maxSubmissions, "Max submissions reached");
        require(campaign.remainingBudget >= campaign.unitPrice, "Insufficient campaign budget");

        campaign.currentSubmissions++;
        campaign.remainingBudget -= campaign.unitPrice;

        // Track contributor earnings
        address contributor = tx.origin; // Get the original sender
        contributorTotalEarned[contributor] += campaign.unitPrice;
        emit ContributorRewarded(contributor, campaign.unitPrice);

        // If budget is exhausted or max submissions reached, deactivate campaign
        if (campaign.remainingBudget < campaign.unitPrice || 
            campaign.currentSubmissions >= campaign.maxSubmissions) {
            campaign.active = false;
            activeCampaignCount--;
            ownerActiveCampaigns[campaign.creator]--;
            emit CampaignDeactivated(_campaignId);
        }

        return campaign.unitPrice;
    }

    /**
     * @dev Gets detailed information about a campaign
     * @param _campaignId The ID of the campaign
     * @return Campaign details
     */
    function getCampaignDetails(uint256 _campaignId) 
        external 
        view 
        campaignExists(_campaignId)
        returns (Campaign memory) 
    {
        return campaigns[_campaignId];
    }

    /**
     * @dev Checks if a campaign is still accepting submissions
     * @param _campaignId The ID of the campaign
     * @return bool indicating if submissions are being accepted
     */
    function isAcceptingSubmissions(uint256 _campaignId) 
        external 
        view 
        campaignExists(_campaignId)
        returns (bool) 
    {
        Campaign storage campaign = campaigns[_campaignId];
        return (
            campaign.active &&
            block.timestamp >= campaign.startTime &&
            block.timestamp <= campaign.expiration &&
            campaign.currentSubmissions < campaign.maxSubmissions &&
            campaign.remainingBudget >= campaign.unitPrice
        );
    }

    /**
     * @dev Gets the encryption public key for a campaign
     * @param _campaignId The ID of the campaign
     * @return The RSA public key used for encrypting submissions
     */
    function getCampaignEncryptionPublicKey(uint256 _campaignId) 
        external 
        view 
        campaignExists(_campaignId)
        returns (string memory) 
    {
        return campaigns[_campaignId].encryptionPublicKey;
    }

    /**
     * @dev Cancels an active campaign and refunds remaining budget
     * @param _campaignId The ID of the campaign to cancel
     */
    function cancelCampaign(uint256 _campaignId) 
        external 
        campaignExists(_campaignId) 
        onlyCampaignCreator(_campaignId) 
    {
        Campaign storage campaign = campaigns[_campaignId];
        require(campaign.active, "Campaign is not active");
        
        campaign.active = false;
        if (campaign.remainingBudget > 0) {
            uint256 refundAmount = campaign.remainingBudget;
            campaign.remainingBudget = 0;
            require(
                rewardToken.transferFrom(escrowContract, campaign.creator, refundAmount),
                "Refund transfer failed"
            );
            emit CampaignCancelled(_campaignId, refundAmount);
        }
        
        activeCampaignCount--;
        ownerActiveCampaigns[campaign.creator]--;
    }

    /**
     * @dev Gets the current status of a campaign
     * @param _campaignId The ID of the campaign
     * @return active Whether the campaign is active
     * @return totalContributions Total number of contributions
     * @return remainingSlots Number of remaining contribution slots
     */
    function getCampaignStatus(uint256 _campaignId)
        external
        view
        campaignExists(_campaignId)
        returns (bool active, uint256 totalContributions, uint256 remainingSlots)
    {
        Campaign storage campaign = campaigns[_campaignId];
        active = campaign.active;
        totalContributions = campaign.currentSubmissions;
        remainingSlots = campaign.maxSubmissions - campaign.currentSubmissions;
    }

    /**
     * @dev Gets the unit price (reward per contribution) for a campaign
     * @param _campaignId The ID of the campaign
     * @return The unit price in tokens
     */
    function getUnitPrice(uint256 _campaignId)
        external
        view
        campaignExists(_campaignId)
        returns (uint256)
    {
        return campaigns[_campaignId].unitPrice;
    }

    /**
     * @dev Gets all active campaigns
     * @return Array of active campaign IDs
     */
    function getActiveCampaigns() external view returns (uint256[] memory) {
        uint256[] memory activeCampaigns = new uint256[](activeCampaignCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < campaignCount; i++) {
            if (campaigns[i].active) {
                activeCampaigns[index] = i;
                index++;
            }
        }
        
        return activeCampaigns;
    }

    /**
     * @dev Gets all active campaigns owned by a specific address
     * @param _owner The address to check
     * @return Array of active campaign IDs owned by the address
     */
    function getOwnerActiveCampaigns(address _owner) external view returns (uint256[] memory) {
        uint256[] memory ownerActiveCampaignIds = new uint256[](ownerActiveCampaigns[_owner]);
        uint256 index = 0;
        
        uint256[] storage allOwnerCampaigns = ownerCampaigns[_owner];
        for (uint256 i = 0; i < allOwnerCampaigns.length; i++) {
            uint256 campaignId = allOwnerCampaigns[i];
            if (campaigns[campaignId].active) {
                ownerActiveCampaignIds[index] = campaignId;
                index++;
            }
        }
        
        return ownerActiveCampaignIds;
    }

    /**
     * @dev Gets total and active campaign counts
     * @return total Total number of campaigns
     * @return active Number of active campaigns
     */
    function getCampaignCount() external view returns (uint256 total, uint256 active) {
        return (campaignCount, activeCampaignCount);
    }

    /**
     * @dev Checks if an address is the owner of a campaign
     * @param _campaignId The ID of the campaign
     * @param _address The address to check
     * @return Whether the address is the campaign owner
     */
    function isCampaignOwner(uint256 _campaignId, address _address) 
        external 
        view 
        campaignExists(_campaignId) 
        returns (bool) 
    {
        return campaigns[_campaignId].creator == _address;
    }

    /**
     * @dev Gets the remaining budget for a campaign
     * @param _campaignId The ID of the campaign
     * @return The remaining budget in tokens
     */
    function getCampaignRemainingBudget(uint256 _campaignId)
        external
        view
        campaignExists(_campaignId)
        returns (uint256)
    {
        return campaigns[_campaignId].remainingBudget;
    }

    /**
     * @dev Gets the total amount spent by an address across all campaigns
     * @param _address The address to check
     * @return The total amount spent in tokens
     */
    function getAddressTotalSpent(address _address) external view returns (uint256) {
        return ownerTotalSpent[_address];
    }

    /**
     * @dev Gets the total amount earned by an address as a contributor
     * @param _address The address to check
     * @return The total amount earned in tokens
     */
    function getAddressTotalEarned(address _address) external view returns (uint256) {
        return contributorTotalEarned[_address];
    }

    /**
     * @dev Gets campaign counts for a specific address
     * @param _address The address to check
     * @return total Total number of campaigns owned
     * @return active Number of active campaigns owned
     */
    function getAddressCampaignCount(address _address) 
        external 
        view 
        returns (uint256 total, uint256 active) 
    {
        return (ownerCampaigns[_address].length, ownerActiveCampaigns[_address]);
    }

    /**
     * @dev Sets a new username for the caller
     * @param _username The desired username
     */
    function setUsername(string memory _username) external {
        require(bytes(_username).length > 0, "Username cannot be empty");
        require(bytes(_username).length <= MAX_USERNAME_LENGTH, "Username too long");
        require(bytes(usernames[msg.sender]).length == 0, "Username already set");
        require(!usernameExists[_username], "Username already taken");
        
        usernames[msg.sender] = _username;
        usernameExists[_username] = true;
        
        emit UsernameSet(msg.sender, _username);
    }

    /**
     * @dev Edits an existing username
     * @param _newUsername The new username
     */
    function editUsername(string memory _newUsername) external {
        require(bytes(_newUsername).length > 0, "Username cannot be empty");
        require(bytes(_newUsername).length <= MAX_USERNAME_LENGTH, "Username too long");
        require(bytes(usernames[msg.sender]).length > 0, "No username set");
        require(!usernameExists[_newUsername], "Username already taken");
        require(usernameEditCount[msg.sender] < MAX_USERNAME_EDITS, "Max edits reached");
        
        string memory oldUsername = usernames[msg.sender];
        usernameExists[oldUsername] = false;
        usernameExists[_newUsername] = true;
        usernames[msg.sender] = _newUsername;
        usernameEditCount[msg.sender]++;
        
        emit UsernameEdited(msg.sender, oldUsername, _newUsername);
    }

    /**
     * @dev Gets the username for an address
     * @param _address The address to look up
     * @return The username associated with the address
     */
    function getUsername(address _address) external view returns (string memory) {
        return usernames[_address];
    }

    /**
     * @dev Gets the number of times an address has edited their username
     * @param _address The address to check
     * @return The number of username edits
     */
    function getUsernameEditCount(address _address) external view returns (uint256) {
        return usernameEditCount[_address];
    }

    /**
     * @dev Gets the minimum score needed to qualify for a reward
     * @param _campaignId The ID of the campaign
     * @return The reward threshold score
     */
    function getRewardThreshold(uint256 _campaignId) 
        external 
        view 
        campaignExists(_campaignId)
        returns (uint256) 
    {
        return campaigns[_campaignId].rewardThreshold;
    }

    /**
     * @dev Gets the creator address of a campaign
     * @param _campaignId The ID of the campaign
     * @return The address of the campaign creator
     */
    function getCampaignCreator(uint256 _campaignId) 
        external 
        view 
        campaignExists(_campaignId)
        returns (address) 
    {
        return campaigns[_campaignId].creator;
    }
}
