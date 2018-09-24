/**
 * @title MultiSendToken
 * @version 1.0
 * @author Validity Labs AG <info@validitylabs.org>
 */

pragma solidity ^0.4.24;  // solhint-disable-line

import "../../node_modules/openzeppelin-solidity/contracts/token/ERC20/BasicToken.sol";


contract MultiSendToken is BasicToken {

    /**
     * @dev Allows the transfer of token amounts to multiple addresses.
     * @param beneficiaries Array of addresses that would receive the tokens.
     * @param amounts Array of amounts to be transferred per beneficiary.
     */
    function multiSend(address[] beneficiaries, uint256[] amounts) public {
        require(beneficiaries.length == amounts.length);

        uint256 length = beneficiaries.length;

        for (uint256 i = 0; i < length; i++) {
            transfer(beneficiaries[i], amounts[i]);
        }
    }
}