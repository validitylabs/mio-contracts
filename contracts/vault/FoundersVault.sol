/**
 * @title Founders Vault contract.
 * Only founders can add Mio tokens to be held in this contract until the release time.
 * @version 1.0
 * @author Validity Labs AG <info@validitylabs.org>
 */

pragma solidity ^0.4.24;  // solhint-disable-line

import "../../node_modules/openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "../../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";
import "../../node_modules/openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";


contract FoundersVault is Ownable {
    using SafeERC20 for ERC20;
    using SafeMath for uint256;

    ERC20 public token;
    uint256 public releaseTime;

    mapping(address => bool) public founder;
    mapping(address => uint256) public balances;

    /**
     * @param accounts The list of addresses to be set as the founders' accounts.
     * @param _token Address of the MioToken to be held.
     * @param _releaseTime Epoch timestamp from which token release is enabled.
     */
    constructor(address[] accounts, address _token, uint256 _releaseTime) public {
        require(block.timestamp < _releaseTime);
        token = ERC20(_token);
        releaseTime = _releaseTime;
        setFounders(accounts);
    }

    /**
     * @dev Allows each founder to set the amount of tokens to be held into this vault contract.
     * @param amount Tokens to be added to the vault.
     */
    function addBalance(uint256 amount) public {
        require(founder[msg.sender]);
        if (balances[msg.sender] == 0) {
            balances[msg.sender] = amount;
        } else {
            balances[msg.sender] = balances[msg.sender].add(amount);
        }
        token.safeTransferFrom(msg.sender, address(this), amount);
    }

    /**
     * @dev Allows the transfer of unlocked tokens to a set of beneficiaries' addresses.
     * @param beneficiaries Array of beneficiaries' addresses that will receive the unlocked tokens.
     */
    function batchRealease(address[] beneficiaries) public {
        uint256 length = beneficiaries.length;
        for (uint256 i = 0; i < length; i++) {
            release(beneficiaries[i]);
        }
    }

    /**
     * @dev Allows a sender to transfer unlocked tokens to the beneficiary's address.
     * @param beneficiary The address that will receive the unlocked tokens.
     */
    function release(address beneficiary) public {
        require(block.timestamp >= releaseTime);
        uint256 amount = balances[beneficiary];
        require(amount > 0);
        token.safeTransfer(beneficiary, amount);
    }

    /**
     * @dev To be called by the constructor. Stores founders' addresses.
     * @param accounts Accounts of the founders.
     */
    function setFounders(address[] accounts) internal {
        uint256 length = accounts.length;
        for (uint256 i = 0; i < length; i++) {
            founder[accounts[i]] = true;
        }
    }
}


