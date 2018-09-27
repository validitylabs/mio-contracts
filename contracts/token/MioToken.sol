/**
 * @title MioToken
 * @version 1.0
 * @author Validity Labs AG <info@validitylabs.org>
 */

pragma solidity ^0.4.24;  // solhint-disable-line

import "../../node_modules/openzeppelin-solidity/contracts/ownership/CanReclaimToken.sol";
import "./SnapshotToken.sol";
import "./MultiSendToken.sol";


contract MioToken is CanReclaimToken, SnapshotToken, MultiSendToken {
    /* solhint-disable */
    string public constant name = "Mio Token";
    string public constant symbol = "#MIO";
    uint8 public constant decimals = 18;
    /* solhint-disable */
}
