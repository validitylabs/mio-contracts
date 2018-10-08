/**
 * @title Token Vault contract.
 * @version 1.0
 * @author Validity Labs AG <info@validitylabs.org>
 */

pragma solidity ^0.4.24;  // solhint-disable-line

import "../../node_modules/openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "../../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";
import "../../node_modules/openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";


contract TokenVault is Ownable {
    using SafeERC20 for ERC20;
    using SafeMath for uint256;

    ERC20 public token;
    uint256 public releaseTime;

    mapping(address => uint256) public lockedBalances;

    /**
     * @param _token Address of the MioToken to be held.
     * @param _releaseTime Epoch timestamp from which token release is enabled.
     */
    constructor(address _token, uint256 _releaseTime) public {
        require(block.timestamp < _releaseTime);
        token = ERC20(_token);
        releaseTime = _releaseTime;
    }

    /**
     * @notice To be called by the account that holds Mio tokens. The caller needs to first approve this vault to
     * transfer tokens on its behalf.
     * The tokens to be locked will be transfered from the caller's account to this vault.
     * The 'value' will be added to the balance of 'account' in this contract.
     * @dev Allows a token holder to add to a another account's balance of locked tokens.
     * @param account Address that will have a balance of locked tokens.
     * @param value Amount of tokens to be locked in this vault.
     */
    function addBalanceFor(address account, uint256 value) public {
        if (lockedBalances[account] == 0) {
            lockedBalances[account] = value;
        } else {
            lockedBalances[account] = lockedBalances[account].add(value);
        }
        token.safeTransferFrom(msg.sender, address(this), value);
    }

    /**
     * @dev Allows a token holder to add to his/her balance of locked tokens.
     * @param value Amount of tokens to be locked in this vault.
     */
    function addBalance(uint256 value) public {
        addBalanceFor(msg.sender, value);
    }

     /**
    * @dev Gets the beneficiary's locked token balance
    * @param account Address of the beneficiary
    */
    function getLockedBalance(address account) public view returns (uint256) {
        return lockedBalances[account];
    }

    /**
     * @dev Allows the caller to transfer unlocked tokens to the beneficiary's address.
     * @param beneficiary The address that will receive the unlocked tokens.
     */
    function releaseFor(address beneficiary) public {
        require(block.timestamp >= releaseTime);
        uint256 amount = lockedBalances[beneficiary];
        require(amount > 0);
        lockedBalances[beneficiary] = 0;
        token.safeTransfer(beneficiary, amount);
    }

    /**
     * @dev Allows the caller to transfer unlocked tokens his/her account.
     */
    function release() public {
        releaseFor(msg.sender);
    }

    /**
     * @dev Allows the transfer of unlocked tokens to a set of beneficiaries' addresses.
     * @param beneficiaries Array of beneficiaries' addresses that will receive the unlocked tokens.
     */
    function batchRelease(address[] beneficiaries) public {
        uint256 length = beneficiaries.length;
        for (uint256 i = 0; i < length; i++) {
            releaseFor(beneficiaries[i]);
        }
    }
}


