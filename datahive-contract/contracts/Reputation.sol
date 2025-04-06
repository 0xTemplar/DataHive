// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title Reputation
 * @dev Manages reputation scores and badges for users in the data marketplace
 */
contract Reputation is Ownable, ReentrancyGuard {
    // Structs
    struct ReputationStore {
        uint256 score;              // Current reputation score
        uint256 contributionCount;  // Total number of contributions
        uint256 paymentCount;       // Total number of successful payments
        uint256 campaignContributionCount; // Number of contributions received in user's campaigns
        uint256[] badges;           // Array of badge IDs earned
        mapping(uint256 => bool) hasBadge;  // Quick lookup for badge ownership
        bool exists;                // Whether this store has been initialized
    }

    struct Badge {
        string name;
        string description;
        uint256 scoreThreshold;      // Minimum score needed
        uint256 contributionThreshold; // Minimum contributions needed
        uint256 paymentThreshold;    // Minimum payments needed
        uint256 campaignContributionThreshold; // Minimum contributions received in campaigns
    }

    // State variables
    mapping(address => ReputationStore) private reputationStores;
    Badge[] public badges;

    // Constants
    uint256 public constant BASE_CONTRIBUTION_POINTS = 10;
    uint256 public constant BASE_PAYMENT_POINTS = 5;
    uint256 public constant BASE_CAMPAIGN_CONTRIBUTION_POINTS = 3; // Points for receiving a contribution
    
    // Events
    event ReputationStoreCreated(address indexed user);
    event ReputationChanged(address indexed user, int256 change, uint256 newScore);
    event BadgeAwarded(address indexed user, uint256 indexed badgeId, string badgeName);
    event ContributionRecorded(address indexed user, uint256 newTotal);
    event PaymentRecorded(address indexed user, uint256 newTotal);
    event CampaignContributionRecorded(address indexed user, uint256 newTotal);
    event BadgeCreated(uint256 indexed badgeId, string name);

    constructor() {
        // Initialize with some default badges
        _createBadge("Novice Contributor", "Made first contribution", 0, 1, 0, 0);
        _createBadge("Active Contributor", "Made 10 contributions", 100, 10, 0, 0);
        _createBadge("Expert Contributor", "Made 50 contributions", 500, 50, 0, 0);
        _createBadge("Trusted Member", "Completed 5 successful payments", 50, 0, 5, 0);
        _createBadge("Elite Member", "High reputation score", 1000, 0, 0, 0);
        _createBadge("Campaign Master", "Received 100 contributions", 300, 0, 0, 100);
    }

    /**
     * @dev Creates a new badge type
     * @param _name Badge name
     * @param _description Badge description
     * @param _scoreThreshold Minimum score needed
     * @param _contributionThreshold Minimum contributions needed
     * @param _paymentThreshold Minimum payments needed
     * @param _campaignContributionThreshold Minimum contributions received in campaigns
     */
    function _createBadge(
        string memory _name,
        string memory _description,
        uint256 _scoreThreshold,
        uint256 _contributionThreshold,
        uint256 _paymentThreshold,
        uint256 _campaignContributionThreshold
    ) internal {
        badges.push(Badge({
            name: _name,
            description: _description,
            scoreThreshold: _scoreThreshold,
            contributionThreshold: _contributionThreshold,
            paymentThreshold: _paymentThreshold,
            campaignContributionThreshold: _campaignContributionThreshold
        }));
        emit BadgeCreated(badges.length - 1, _name);
    }

    /**
     * @dev Ensures the caller has a reputation store
     */
    function ensureReputationStoreExists(address _user) public {
        if (!reputationStores[_user].exists) {
            reputationStores[_user].exists = true;
            emit ReputationStoreCreated(_user);
        }
    }

    /**
     * @dev Checks if an address has a reputation store
     */
    function hasReputationStore(address _user) public view returns (bool) {
        return reputationStores[_user].exists;
    }

    /**
     * @dev Adds reputation points to a user's score
     * @param _user Address of the user
     * @param _points Number of points to add
     */
    function addReputationPoints(address _user, uint256 _points) external onlyOwner {
        ensureReputationStoreExists(_user);
        reputationStores[_user].score += _points;
        emit ReputationChanged(_user, int256(_points), reputationStores[_user].score);
        _checkAndAwardBadges(_user);
    }

    /**
     * @dev Records a successful contribution and awards points
     * @param _user Address of the contributor
     */
    function recordSuccessfulContribution(address _user) external onlyOwner {
        ensureReputationStoreExists(_user);
        reputationStores[_user].contributionCount++;
        reputationStores[_user].score += BASE_CONTRIBUTION_POINTS;
        
        emit ContributionRecorded(_user, reputationStores[_user].contributionCount);
        emit ReputationChanged(_user, int256(BASE_CONTRIBUTION_POINTS), reputationStores[_user].score);
        
        _checkAndAwardBadges(_user);
    }

    /**
     * @dev Records a successful payment and awards points
     * @param _user Address of the user
     */
    function recordSuccessfulPayment(address _user) external onlyOwner {
        ensureReputationStoreExists(_user);
        reputationStores[_user].paymentCount++;
        reputationStores[_user].score += BASE_PAYMENT_POINTS;
        
        emit PaymentRecorded(_user, reputationStores[_user].paymentCount);
        emit ReputationChanged(_user, int256(BASE_PAYMENT_POINTS), reputationStores[_user].score);
        
        _checkAndAwardBadges(_user);
    }

    /**
     * @dev Records a successful contribution to a campaign and awards points to the campaign creator
     * @param _campaignCreator Address of the campaign creator
     */
    function recordSuccessfulCampaignContribution(address _campaignCreator) external onlyOwner {
        ensureReputationStoreExists(_campaignCreator);
        reputationStores[_campaignCreator].campaignContributionCount++;
        reputationStores[_campaignCreator].score += BASE_CAMPAIGN_CONTRIBUTION_POINTS;
        
        emit CampaignContributionRecorded(_campaignCreator, reputationStores[_campaignCreator].campaignContributionCount);
        emit ReputationChanged(_campaignCreator, int256(BASE_CAMPAIGN_CONTRIBUTION_POINTS), reputationStores[_campaignCreator].score);
        
        _checkAndAwardBadges(_campaignCreator);
    }

    /**
     * @dev Internal function to check and award badges
     * @param _user Address of the user
     */
    function _checkAndAwardBadges(address _user) internal {
        ReputationStore storage store = reputationStores[_user];
        
        for (uint256 i = 0; i < badges.length; i++) {
            if (!store.hasBadge[i]) {  // Only check badges the user doesn't have
                Badge memory badge = badges[i];
                if (store.score >= badge.scoreThreshold &&
                    store.contributionCount >= badge.contributionThreshold &&
                    store.paymentCount >= badge.paymentThreshold &&
                    store.campaignContributionCount >= badge.campaignContributionThreshold) {
                    _awardBadge(_user, i);
                }
            }
        }
    }

    /**
     * @dev Internal function to award a badge
     * @param _user Address of the user
     * @param _badgeId ID of the badge to award
     */
    function _awardBadge(address _user, uint256 _badgeId) internal {
        ReputationStore storage store = reputationStores[_user];
        require(!store.hasBadge[_badgeId], "Badge already awarded");
        
        store.badges.push(_badgeId);
        store.hasBadge[_badgeId] = true;
        
        emit BadgeAwarded(_user, _badgeId, badges[_badgeId].name);
    }

    /**
     * @dev Gets the reputation score for an address
     * @param _user Address to check
     * @return Current reputation score
     */
    function getReputationScore(address _user) external view returns (uint256) {
        return reputationStores[_user].score;
    }

    /**
     * @dev Gets the number of badges earned by an address
     * @param _user Address to check
     * @return Number of badges earned
     */
    function getBadgeCount(address _user) external view returns (uint256) {
        return reputationStores[_user].badges.length;
    }

    /**
     * @dev Gets all badges earned by an address
     * @param _user Address to check
     * @return Array of badge IDs
     */
    function getBadges(address _user) external view returns (uint256[] memory) {
        return reputationStores[_user].badges;
    }

    /**
     * @dev Gets the total number of contributions for an address
     * @param _user Address to check
     * @return Number of contributions
     */
    function getContributionCount(address _user) external view returns (uint256) {
        return reputationStores[_user].contributionCount;
    }

    /**
     * @dev Gets the total number of successful payments for an address
     * @param _user Address to check
     * @return Number of successful payments
     */
    function getSuccessfulPayments(address _user) external view returns (uint256) {
        return reputationStores[_user].paymentCount;
    }

    /**
     * @dev Gets the total number of contributions received in user's campaigns
     * @param _user Address to check
     * @return Number of contributions received
     */
    function getCampaignContributionCount(address _user) external view returns (uint256) {
        return reputationStores[_user].campaignContributionCount;
    }
} 