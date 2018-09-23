/**
 * Test for MioToken
 *
 * @author Validity Labs AG <info@validitylabs.org>
 */

import {expectThrow, getEvents, BigNumber} from '../helpers/tools';
import {logger as log} from '../../../tools/lib/logger';

const MioToken = artifacts.require('./MioToken');

require('chai')
    .use(require('chai-as-promised'))
    .use(require('chai-bignumber')(BigNumber))
    .should();

/**
 * MioToken contract
 */
contract('MioToken', ([initialOwner, owner, recipient1, recipient2, recipient3, anotherAccount, wallet]) => {
    // keep track of history by block number
    const blockNum = [];

    const totalSupply = new BigNumber(100);
    const amount = new BigNumber(50);

    // Provide a newly deployed mioTokenInstance for every test case
    let mioTokenInstance;
    before(async () => {
        mioTokenInstance = await MioToken.new();
    });

    describe('when instantiated', () => {
        const NAME = 'Mio Token';
        const SYMBOL = '#MIO';
        const DECIMALS = 18;

        it('has the right name', async () => {
            (await mioTokenInstance.NAME()).should.be.equal(NAME);
        });

        it('has the right symbol', async () => {
            (await mioTokenInstance.SYMBOL()).should.be.equal(SYMBOL);
        });

        it('has the right decimals', async () => {
            (await mioTokenInstance.DECIMALS()).should.be.bignumber.equal(DECIMALS);
        });

        it('has an owner', async () => {
            (await mioTokenInstance.owner()).should.be.equal(initialOwner);
        });

        it('has total supply equal to 0', async () => {
            (await mioTokenInstance.totalSupply()).should.be.bignumber.equal(0);
        });
    });

    describe('transferOwnership', async () => {
        context('when called by a non-owner account', async () => {
            it('fails', async () => {
                await expectThrow(mioTokenInstance.transferOwnership(anotherAccount, {from: anotherAccount}));
            });
        });

        context('when called by the owner', async () => {
            it('transfers ownership successfully', async () => {
                await mioTokenInstance.transferOwnership(owner, {from: initialOwner});

                (await mioTokenInstance.owner()).should.be.equal(owner);
            });
        });
    });

    describe('mint', async () => {
        context('when called by a non-owner account', async () => {
            it('fails', async () => {
                await expectThrow(mioTokenInstance.mint(wallet, totalSupply, {from: anotherAccount}));
            });
        });

        context('when called by the owner account', async () => {
            it('mints requested amount and emit events', async () => {
                const tx = await mioTokenInstance.mint(wallet, totalSupply, {from: owner});
                const events = getEvents(tx);

                (await mioTokenInstance.balanceOf(wallet)).should.be.bignumber.equal(totalSupply);
                events.Mint[0].to.should.be.equal(wallet);
                events.Mint[0].amount.should.be.bignumber.equal(totalSupply);
                events.Transfer[0].to.should.be.equal(wallet);
                events.Transfer[0].value.should.be.bignumber.equal(totalSupply);

                blockNum[0] = web3.eth.blockNum;
            });
        });
    });

    describe('totalSupply', async () => {
        it('returns the total amount of tokens', async () => {
            (await mioTokenInstance.totalSupply()).should.be.bignumber.equal(totalSupply);
        });
    });

    describe('multiSend', async () => {
        context('when the arrays have different length', async () => {
            it('fails', async () => {
                await expectThrow(mioTokenInstance.multiSend([recipient1, recipient2], [amount], {from: wallet}));
            });
        });

        context('when the arrays have the same length', async () => {
            context('when paused', async () => {
                it('fails', async () => {
                    await mioTokenInstance.pause({from: owner});

                    (await mioTokenInstance.paused()).should.equal(true);
                    await expectThrow(mioTokenInstance.multiSend([recipient1, recipient2], [amount, amount], {from: wallet}));
                });
            });

            context('when unpaused', async () => {
                context('when the sender hasn\'t enough balance', async () => {
                    it('fails', async () => {
                        await mioTokenInstance.unpause({from: owner});

                        (await mioTokenInstance.paused()).should.equal(false);
                        await expectThrow(mioTokenInstance.multiSend([recipient1, recipient2], [totalSupply, amount], {from: wallet}));
                    });
                });

                context('when the sender has enough balance', async () => {
                    it('transfers amounts sucessfully', async () => {
                        await mioTokenInstance.multiSend([recipient1, recipient2], [amount, amount], {from: wallet});

                        (await mioTokenInstance.balanceOf(wallet)).should.be.bignumber.equal(0);
                        (await mioTokenInstance.balanceOf(recipient1)).should.be.bignumber.equal(amount);
                        (await mioTokenInstance.balanceOf(recipient2)).should.be.bignumber.equal(amount);

                        blockNum[1] = web3.eth.blockNum;
                    });
                });
            });
        });
    });
    // @TODO: include test cases
    describe.skip('multiSendTightlyPacked', async () => {

    });
});
