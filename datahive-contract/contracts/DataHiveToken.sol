// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title DataHiveToken
 * @dev ERC20 token to be used as reward currency in the DataHive platform
 */
contract DataHiveToken is ERC20, ERC20Burnable, Pausable, Ownable {
    // Max supply cap (100 million tokens with 18 decimals)
    uint256 public constant MAX_SUPPLY = 100_000_000 * 10**18;
    
    // Events
    event Minted(address indexed to, uint256 amount);
    event BatchTransferred(address indexed from, address[] to, uint256[] amounts);

    /**
     * @dev Constructor to create the DataHive token
     * @param initialSupply Initial amount to mint (in tokens, not wei)
     * @param initialHolder Address to receive the initial supply
     */
    constructor(uint256 initialSupply, address initialHolder) ERC20("DataHive Token", "DHT") {
        require(initialSupply <= MAX_SUPPLY, "Initial supply exceeds max supply");
        require(initialHolder != address(0), "Initial holder cannot be the zero address");
        
        // Convert to wei (token has 18 decimals) and mint to initial holder
        uint256 initialSupplyWei = initialSupply * 10**18;
        _mint(initialHolder, initialSupplyWei);
    }

    /**
     * @dev Pauses all token transfers
     * Only contract owner can call this
     */
    function pause() public onlyOwner {
        _pause();
    }

    /**
     * @dev Unpauses all token transfers
     * Only contract owner can call this
     */
    function unpause() public onlyOwner {
        _unpause();
    }

    /**
     * @dev Mints new tokens to a specified address
     * @param to Address receiving the new tokens
     * @param amount Amount of tokens to mint (in wei)
     */
    function mint(address to, uint256 amount) public onlyOwner {
        require(to != address(0), "Cannot mint to the zero address");
        require(totalSupply() + amount <= MAX_SUPPLY, "Mint would exceed max supply");
        _mint(to, amount);
        emit Minted(to, amount);
    }

    /**
     * @dev Batch transfer tokens to multiple addresses
     * @param recipients Array of recipient addresses
     * @param amounts Array of amounts to transfer to each recipient (in wei)
     */
    function batchTransfer(address[] memory recipients, uint256[] memory amounts) public {
        require(recipients.length == amounts.length, "Arrays must have same length");
        require(recipients.length > 0, "Must have at least one recipient");
        
        uint256 totalAmount = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            require(recipients[i] != address(0), "Cannot transfer to the zero address");
            totalAmount += amounts[i];
        }
        
        require(balanceOf(msg.sender) >= totalAmount, "Insufficient balance for batch transfer");
        
        for (uint256 i = 0; i < recipients.length; i++) {
            _transfer(msg.sender, recipients[i], amounts[i]);
        }
        
        emit BatchTransferred(msg.sender, recipients, amounts);
    }

    /**
     * @dev Hook that is called before any transfer of tokens
     * Used to implement the pause functionality
     */
    function _beforeTokenTransfer(address from, address to, uint256 amount)
        internal
        whenNotPaused
        override
    {
        super._beforeTokenTransfer(from, to, amount);
    }
} 