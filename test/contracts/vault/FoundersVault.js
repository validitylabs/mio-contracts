/**
 * Test for FoundersVault
 *
 * @author Validity Labs AG <info@validitylabs.org>
 */

import {expectThrow, getEvents, BigNumber} from '../helpers/tools';

const MioToken = artifacts.require('./MioToken');
const FoundersVault = artifacts.require('./FoundersVault');

require('chai')
    .use(require('chai-as-promised'))
    .use(require('chai-bignumber')(BigNumber))
    .should();

/**
 * FoundersVault contract
 */
contract('FoundersVault', ([initialOwner, owner, founder1, founder2, anotherAccount]) => {
    const totalSupply = new BigNumber(100);
    const amount = new BigNumber(10);

    // Provide a newly deployed foundersVaultInstance for every test case
    let foundersVaultInstance;
    before(async () => {
        foundersVaultInstance = await FoundersVault.new();
    });
});
