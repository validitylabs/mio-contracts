/**
 * Test for MioToken
 *
 * @author Validity Labs AG <info@validitylabs.org>
 */

import {expectThrow, getEvents, BigNumber} from '../helpers/tools';

const MioToken = artifacts.require('./MioToken');

require('chai')
    .use(require('chai-as-promised'))
    .use(require('chai-bignumber')(BigNumber))
    .should();

/**
 * MioToken contract
 */
contract('MioToken', ([initialOwner, owner, recipient1, recipient2, recipient3, anotherAccount]) => {
    const totalSupply = new BigNumber(100);
    const amount = new BigNumber(10);

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
                await expectThrow(mioTokenInstance.mint(owner, totalSupply, {from: anotherAccount}));
            });
        });

        context('when called by the owner account', async () => {
            it('mints requested amount and emit events', async () => {
                const tx = await mioTokenInstance.mint(owner, totalSupply, {from: owner});
                const {blockNumber} = web3.eth;

                (await mioTokenInstance.totalSupply()).should.be.bignumber.equal(totalSupply);
                (await mioTokenInstance.totalSupplyAt(blockNumber)).should.be.bignumber.equal(totalSupply);
                (await mioTokenInstance.totalSupplyAt(blockNumber - 1)).should.be.bignumber.equal(0);

                (await mioTokenInstance.balanceOf(owner)).should.be.bignumber.equal(totalSupply);
                (await mioTokenInstance.balanceOfAt(owner, blockNumber)).should.be.bignumber.equal(totalSupply);
                (await mioTokenInstance.balanceOfAt(owner, blockNumber - 1)).should.be.bignumber.equal(0);

                const events = getEvents(tx);
                events.Mint[0].to.should.be.equal(owner);
                events.Mint[0].amount.should.be.bignumber.equal(totalSupply);
                events.Transfer[0].to.should.be.equal(owner);
                events.Transfer[0].value.should.be.bignumber.equal(totalSupply);
            });
        });
    });

    describe('multiSend', async () => {
        context('when the arrays have different length', async () => {
            it('fails', async () => {
                await expectThrow(mioTokenInstance.multiSend([recipient1, recipient2], [amount], {from: owner}));
            });
        });

        context('when the arrays have the same length', async () => {
            context('when paused', async () => {
                it('fails', async () => {
                    await mioTokenInstance.pause({from: owner});
                    (await mioTokenInstance.paused()).should.equal(true);

                    await expectThrow(mioTokenInstance.multiSend([recipient1, recipient2], [amount, amount], {from: owner}));
                });
            });

            context('when unpaused', async () => {
                context('when the sender hasn\'t enough balance', async () => {
                    it('fails', async () => {
                        await mioTokenInstance.unpause({from: owner});
                        (await mioTokenInstance.paused()).should.equal(false);

                        await expectThrow(mioTokenInstance.multiSend([recipient1, recipient2], [totalSupply, amount], {from: owner}));
                    });
                });

                context('when the sender has enough balance', async () => {
                    it('transfers amounts sucessfully', async () => {
                        await mioTokenInstance.multiSend([recipient1, recipient2], [amount, amount], {from: owner});

                        const {blockNumber} = web3.eth;

                        (await mioTokenInstance.balanceOfAt(owner, blockNumber)).should.be.bignumber.equal(totalSupply.sub(amount.mul(2)));
                        (await mioTokenInstance.balanceOfAt(recipient1, blockNumber)).should.be.bignumber.equal(amount);
                        (await mioTokenInstance.balanceOfAt(recipient2, blockNumber)).should.be.bignumber.equal(amount);

                        (await mioTokenInstance.balanceOfAt(owner, blockNumber - 1)).should.be.bignumber.equal(totalSupply);
                        (await mioTokenInstance.balanceOfAt(recipient1, blockNumber - 1)).should.be.bignumber.equal(0);
                        (await mioTokenInstance.balanceOfAt(recipient2, blockNumber - 1)).should.be.bignumber.equal(0);
                    });
                });
            });
        });
    });

    describe('transfer', async () => {
        context('when paused', async () => {
            it('fails', async () => {
                await mioTokenInstance.pause({from: owner});

                await expectThrow(mioTokenInstance.transfer(recipient3, amount, {from: recipient1}));
                (await mioTokenInstance.balanceOf(recipient3)).should.be.bignumber.equal(0);
            });
        });

        context('when unpaused', async () => {
            context('when the sender hasn\'t enough balance', async () => {
                it('fails', async () => {
                    await mioTokenInstance.unpause({from: owner});

                    await expectThrow(mioTokenInstance.transfer(recipient3, amount, {from: anotherAccount}));
                    (await mioTokenInstance.balanceOf(recipient3)).should.be.bignumber.equal(0);
                });
            });

            context('when the sender has enough balance', async () => {
                context('when recipient is zero address', async () => {
                    const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

                    it('fails', async () => {
                        await expectThrow(mioTokenInstance.transfer(ZERO_ADDRESS, amount, {from: recipient1}));
                        (await mioTokenInstance.balanceOf(ZERO_ADDRESS)).should.be.bignumber.equal(0);
                    });
                });

                context('when recipient is the token contract', async () => {
                    it('fails', async () => {
                        await expectThrow(mioTokenInstance.transfer(mioTokenInstance.address, amount, {from: recipient1}));
                        (await mioTokenInstance.balanceOf(mioTokenInstance.address)).should.be.bignumber.equal(0);
                    });
                });

                context('when recipient is different to zero address and the token contract', async () => {
                    context('when amount is 0', async () => {
                        it('emits Transfer event', async () => {
                            const tx = await mioTokenInstance.transfer(recipient3, 0, {from: recipient1});
                            const events = getEvents(tx);

                            events.Transfer[0].to.should.be.equal(recipient3);
                            events.Transfer[0].value.should.be.bignumber.equal(0);
                        });
                    });

                    context('when amount is different to 0', async () => {
                        it('transfers amount', async () => {
                            await mioTokenInstance.transfer(recipient3, amount, {from: recipient1});
                            const {blockNumber} = web3.eth;

                            (await mioTokenInstance.balanceOfAt(recipient1, blockNumber)).should.be.bignumber.equal(0);
                            (await mioTokenInstance.balanceOfAt(recipient3, blockNumber)).should.be.bignumber.equal(amount);

                            (await mioTokenInstance.balanceOfAt(recipient1, blockNumber - 1)).should.be.bignumber.equal(amount);
                            (await mioTokenInstance.balanceOfAt(recipient3, blockNumber - 1)).should.be.bignumber.equal(0);
                        });
                    });
                });
            });
        });
    });

    describe('approve', async () => {
        context('when paused', async () => {
            it('fails', async () => {
                await mioTokenInstance.pause({from: owner});

                await expectThrow(mioTokenInstance.approve(anotherAccount, amount, {from: recipient3}));
            });
        });

        context('when unpaused', async () => {
            context('when spender has no approved amount', async () => {
                it('approves the requested amount', async () => {
                    await mioTokenInstance.unpause({from: owner});
                    const tx = await mioTokenInstance.approve(anotherAccount, 1, {from: recipient3});

                    (await mioTokenInstance.allowance(recipient3, anotherAccount)).should.be.bignumber.equal(1);

                    const events = getEvents(tx);
                    events.Approval[0].owner.should.be.equal(recipient3);
                    events.Approval[0].spender.should.be.equal(anotherAccount);
                    events.Approval[0].value.should.be.bignumber.equal(1);
                });
            });

            context('when spender has an approved amount', async () => {
                context('when trying to approve a new amount', async () => {
                    it('fails', async () => {
                        await expectThrow(mioTokenInstance.approve(anotherAccount, amount, {from: recipient3}));

                        (await mioTokenInstance.allowance(recipient3, anotherAccount)).should.be.bignumber.equal(1);
                    });
                });

                context('when new amount is zero', async () => {
                    it('replaces the approved amount with zero and emits event', async () => {
                        const tx = await mioTokenInstance.approve(anotherAccount, 0, {from: recipient3});

                        (await mioTokenInstance.allowance(recipient3, anotherAccount)).should.be.bignumber.equal(0);

                        const events = getEvents(tx);
                        events.Approval[0].owner.should.be.equal(recipient3);
                        events.Approval[0].spender.should.be.equal(anotherAccount);
                        events.Approval[0].value.should.be.bignumber.equal(0);
                    });
                });
            });
        });
    });

    describe('transferFrom', async () => {
        before(async () => {
            await mioTokenInstance.approve(anotherAccount, amount, {from: owner});
        });

        context('when paused', async () => {
            before(async () => {
                await mioTokenInstance.pause({from: owner});
            });

            it('fails', async () => {
                await expectThrow(mioTokenInstance.transferFrom(owner, initialOwner, amount, {from: anotherAccount}));
            });
        });

        context('when unpaused', async () => {
            before(async () => {
                await mioTokenInstance.unpause({from: owner});
            });

            context('when spender hasn\'t enough approved balance', async () => {
                it('fails', async () => {
                    await expectThrow(mioTokenInstance.transferFrom(owner, initialOwner, amount + 1, {from: anotherAccount}));
                });
            });

            context('when spender has enough approved balance', async () => {
                it('transfers the requested amount', async () => {
                    await mioTokenInstance.transferFrom(owner, initialOwner, amount, {from: anotherAccount});
                    const {blockNumber} = web3.eth;

                    (await mioTokenInstance.allowance(owner, anotherAccount)).should.be.bignumber.equal(0);

                    (await mioTokenInstance.balanceOfAt(owner, blockNumber)).should.be.bignumber.equal(totalSupply.sub(amount.mul(3)));
                    (await mioTokenInstance.balanceOfAt(initialOwner, blockNumber)).should.be.bignumber.equal(amount);

                    (await mioTokenInstance.balanceOfAt(owner, blockNumber - 1)).should.be.bignumber.equal(totalSupply.sub(amount.mul(2)));
                    (await mioTokenInstance.balanceOfAt(initialOwner, blockNumber - 1)).should.be.bignumber.equal(0);
                });
            });
        });
    });
});
