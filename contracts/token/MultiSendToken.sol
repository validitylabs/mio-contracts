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

    /// @notice Send to multiple addresses using a byte32 array which
    ///  includes the address and the amount.
    ///  Addresses and amounts are stored in a packed bytes32 array
    ///  Address is stored in the 20 most significant bytes
    ///  The address is retrieved by bitshifting 96 bits to the right
    ///  Amount is stored in the 12 least significant bytes
    ///  The amount is retrieved by taking the 96 least significant bytes
    ///  and converting them into an unsigned integer
    /// @param addressesAndAmounts Bitwise packed array of addresses
    ///  and amounts
    function multiSendTightlyPacked(bytes32[] addressesAndAmounts) public {
        for (uint256 i = 0; i < addressesAndAmounts.length; i++) {
            address to = address(addressesAndAmounts[i] >> 96);
            uint amount = uint(uint96(addressesAndAmounts[i]));
            transfer(to, amount);
        }
    }
}