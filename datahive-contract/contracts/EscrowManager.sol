// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title EscrowManager
 * @dev Manages token escrow for campaign rewards
 */
contract EscrowManager is Ownable, ReentrancyGuard {
    // State variables
    IERC20 public rewardToken;
    address public campaignManager;
    address public contributionManager;
    
    // Events
    event RewardReleased(address indexed recipient, uint256 amount);
    event CampaignManagerUpdated(address contractAddress);
    event ContributionManagerUpdated(address contractAddress);
    
    // Modifiers
    modifier onlyAuthorized() {
        require(
            msg.sender == owner() || 
            msg.sender == campaignManager || 
            msg.sender == contributionManager,
            "Not authorized"
        );
        _;
    }
    
    /**
     * @dev Constructor
     * @param _rewardToken The ERC20 token used for rewards
     */
    constructor(IERC20 _rewardToken) {
        rewardToken = _rewardToken;
    }
    
    /**
     * @dev Set the CampaignManager contract address
     * @param _campaignManager Address of the CampaignManager contract
     */
    function setCampaignManager(address _campaignManager) external onlyOwner {
        campaignManager = _campaignManager;
        emit CampaignManagerUpdated(_campaignManager);
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
     * @dev Release reward to a contributor
     * @param _contributor Address of the contributor
     * @param _amount Amount of tokens to release
     */
    function releaseReward(address _contributor, uint256 _amount) 
        external 
        onlyAuthorized 
        nonReentrant 
    {
        require(_contributor != address(0), "Invalid contributor address");
        require(_amount > 0, "Amount must be greater than 0");
        
        require(
            rewardToken.transfer(_contributor, _amount),
            "Token transfer failed"
        );
        
        emit RewardReleased(_contributor, _amount);
    }
    
    /**
     * @dev Get the current token balance of the escrow
     * @return Current balance
     */
    function getBalance() external view returns (uint256) {
        return rewardToken.balanceOf(address(this));
    }
} 