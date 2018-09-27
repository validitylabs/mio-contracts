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
    const zeroAddress = '0x0000000000000000000000000000000000000000';

    // Provide a newly deployed mioTokenInstance for every test case
    let mioTokenInstance;
    before(async () => {
        mioTokenInstance = await MioToken.new();
    });

    describe('when instantiated', () => {
        const name = 'Mio Token';
        const symbol = '#MIO';
        const decimals = 18;

        it('has the right name', async () => {
            (await mioTokenInstance.name()).should.be.equal(name);
        });

        it('has the right symbol', async () => {
            (await mioTokenInstance.symbol()).should.be.equal(symbol);
        });

        it('has the right decimals', async () => {
            (await mioTokenInstance.decimals()).should.be.bignumber.equal(decimals);
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
            let tx;
            let blockNum;
            before(async () => {
                tx = await mioTokenInstance.mint(owner, totalSupply, {from: owner});
                blockNum = web3.eth.blockNumber;
            });
            it('mints requested amount', async () => {
                (await mioTokenInstance.totalSupply()).should.be.bignumber.equal(totalSupply);
                (await mioTokenInstance.totalSupplyAt(blockNum)).should.be.bignumber.equal(totalSupply);
                (await mioTokenInstance.totalSupplyAt(blockNum - 1)).should.be.bignumber.equal(0);

                (await mioTokenInstance.balanceOf(owner)).should.be.bignumber.equal(totalSupply);
                (await mioTokenInstance.balanceOfAt(owner, blockNum)).should.be.bignumber.equal(totalSupply);
                (await mioTokenInstance.balanceOfAt(owner, blockNum - 1)).should.be.bignumber.equal(0);
            });

            it('emits a mint event', async () => {
                const mintEvents = getEvents(tx, 'Mint');
                mintEvents[0].to.should.be.equal(owner);
                mintEvents[0].amount.should.be.bignumber.equal(totalSupply);
            });

            it('emits a transfer event', async () => {
                const transferEvents = getEvents(tx, 'Transfer');
                transferEvents[0].from.should.be.equal(zeroAddress);
                transferEvents[0].to.should.be.equal(owner);
                transferEvents[0].value.should.be.bignumber.equal(totalSupply);
            });
        });
    });

    describe('finishMinting', async () => {
        context('when token minting hasn\'t finished', async () => {
            it('finishes token minting', async () => {
                await mioTokenInstance.finishMinting({from: owner});

                (await mioTokenInstance.mintingFinished()).should.be.equal(true);
                await expectThrow(mioTokenInstance.mint(owner, totalSupply, {from: owner}));
            });
        });

        context('when token minting had already finished', async () => {
            it('fails', async () => {
                await expectThrow(mioTokenInstance.finishMinting({from: owner}));
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

                        const blockNum = web3.eth.blockNumber;

                        (await mioTokenInstance.balanceOfAt(owner, blockNum)).should.be.bignumber.equal(totalSupply.sub(amount.mul(2)));
                        (await mioTokenInstance.balanceOfAt(recipient1, blockNum)).should.be.bignumber.equal(amount);
                        (await mioTokenInstance.balanceOfAt(recipient2, blockNum)).should.be.bignumber.equal(amount);

                        (await mioTokenInstance.balanceOfAt(owner, blockNum - 1)).should.be.bignumber.equal(totalSupply);
                        (await mioTokenInstance.balanceOfAt(recipient1, blockNum - 1)).should.be.bignumber.equal(0);
                        (await mioTokenInstance.balanceOfAt(recipient2, blockNum - 1)).should.be.bignumber.equal(0);
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
            before(async () => {
                await mioTokenInstance.unpause({from: owner});
            });

            context('when the sender hasn\'t enough balance', async () => {
                it('fails', async () => {
                    await expectThrow(mioTokenInstance.transfer(recipient3, amount, {from: anotherAccount}));
                    (await mioTokenInstance.balanceOf(recipient3)).should.be.bignumber.equal(0);
                });
            });

            context('when the sender has enough balance', async () => {
                context('when recipient is zero address', async () => {
                    it('fails', async () => {
                        await expectThrow(mioTokenInstance.transfer(zeroAddress, amount, {from: recipient1}));
                        (await mioTokenInstance.balanceOf(zeroAddress)).should.be.bignumber.equal(0);
                    });
                });

                context('when recipient is the token contract', async () => {
                    it('fails', async () => {
                        await expectThrow(mioTokenInstance.transfer(mioTokenInstance.address, amount, {from: recipient1}));
                        (await mioTokenInstance.balanceOf(mioTokenInstance.address)).should.be.bignumber.equal(0);
                    });
                });

                context('when recipient is different to zero address and the token contract', async () => {
                    context('when amount is zero', async () => {
                        it('emits a transfer event', async () => {
                            const tx = await mioTokenInstance.transfer(recipient3, 0, {from: recipient1});
                            const transferEvents = getEvents(tx, 'Transfer');

                            transferEvents[0].from.should.be.equal(recipient1);
                            transferEvents[0].to.should.be.equal(recipient3);
                            transferEvents[0].value.should.be.bignumber.equal(0);
                        });
                    });

                    context('when amount is different to zero', async () => {
                        let tx;
                        let blockNum;
                        before(async () => {
                            tx = await mioTokenInstance.transfer(recipient3, amount, {from: recipient1});
                            blockNum = web3.eth.blockNumber;
                        });

                        it('transfers requested amount', async () => {
                            (await mioTokenInstance.balanceOfAt(recipient1, blockNum)).should.be.bignumber.equal(0);
                            (await mioTokenInstance.balanceOfAt(recipient3, blockNum)).should.be.bignumber.equal(amount);

                            (await mioTokenInstance.balanceOfAt(recipient1, blockNum - 1)).should.be.bignumber.equal(amount);
                            (await mioTokenInstance.balanceOfAt(recipient3, blockNum - 1)).should.be.bignumber.equal(0);
                        });

                        it('emits a transfer event', async () => {
                            const transferEvents = getEvents(tx, 'Transfer');

                            transferEvents[0].from.should.be.equal(recipient1);
                            transferEvents[0].to.should.be.equal(recipient3);
                            transferEvents[0].value.should.be.bignumber.equal(amount);
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
            before(async () => {
                await mioTokenInstance.unpause({from: owner});
            });
            context('when spender has no previous approved amount', async () => {
                let tx;
                before(async () => {
                    tx = await mioTokenInstance.approve(anotherAccount, 1, {from: recipient3});
                });

                it('approves the requested amount', async () => {
                    (await mioTokenInstance.allowance(recipient3, anotherAccount)).should.be.bignumber.equal(1);
                });

                it('emits an approval event', async () => {
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
                    let tx;
                    before(async () => {
                        tx = await mioTokenInstance.approve(anotherAccount, 0, {from: recipient3});
                    });

                    it('replaces the approved amount with zero', async () => {
                        (await mioTokenInstance.allowance(recipient3, anotherAccount)).should.be.bignumber.equal(0);
                    });

                    it('emits an approval event', async () => {
                        const approvalEvents = getEvents(tx, 'Approval');
                        approvalEvents[0].owner.should.be.equal(recipient3);
                        approvalEvents[0].spender.should.be.equal(anotherAccount);
                        approvalEvents[0].value.should.be.bignumber.equal(0);
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
            it('fails', async () => {
                await mioTokenInstance.pause({from: owner});

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
                let tx;
                let blockNum;
                before(async () => {
                    tx = await mioTokenInstance.transferFrom(owner, initialOwner, amount, {from: anotherAccount});
                    blockNum = web3.eth.blockNumber;
                });

                it('transfers the requested amount', async () => {
                    (await mioTokenInstance.allowance(owner, anotherAccount)).should.be.bignumber.equal(0);

                    (await mioTokenInstance.balanceOfAt(owner, blockNum)).should.be.bignumber.equal(totalSupply.sub(amount.mul(3)));
                    (await mioTokenInstance.balanceOfAt(initialOwner, blockNum)).should.be.bignumber.equal(amount);

                    (await mioTokenInstance.balanceOfAt(owner, blockNum - 1)).should.be.bignumber.equal(totalSupply.sub(amount.mul(2)));
                    (await mioTokenInstance.balanceOfAt(initialOwner, blockNum - 1)).should.be.bignumber.equal(0);
                });

                it('emits a transfer event', async () => {
                    const transferEvents = getEvents(tx, 'Transfer');
                    transferEvents[0].from.should.be.equal(owner);
                    transferEvents[0].to.should.be.equal(initialOwner);
                    transferEvents[0].value.should.be.bignumber.equal(amount);
                });
            });
        });
    });

    describe('increaseApproval', async () => {
        before(async () => {
            await mioTokenInstance.approve(anotherAccount, amount, {from: owner});
        });

        context('when paused', async () => {
            it('fails', async () => {
                await mioTokenInstance.pause({from: owner});

                await expectThrow(mioTokenInstance.increaseApproval(anotherAccount, 1, {from: owner}));
            });
        });

        context('when unpaused', async () => {
            let tx;
            before(async () => {
                await mioTokenInstance.unpause({from: owner});
                tx = await mioTokenInstance.increaseApproval(anotherAccount, 1, {from: owner});
            });

            it('increases allowance', async () => {
                (await mioTokenInstance.allowance(owner, anotherAccount)).should.be.bignumber.equal(amount.add(1));
            });

            it('emits an approval event', async () => {
                const approvalEvents = getEvents(tx, 'Approval');
                approvalEvents[0].owner.should.be.equal(owner);
                approvalEvents[0].spender.should.be.equal(anotherAccount);
                approvalEvents[0].value.should.be.bignumber.equal(amount.add(1));
            });
        });
    });

    describe('decreaseApproval', async () => {
        context('when paused', async () => {
            it('fails', async () => {
                await mioTokenInstance.pause({from: owner});

                await expectThrow(mioTokenInstance.decreaseApproval(anotherAccount, 1, {from: owner}));
            });
        });

        context('when unpaused', async () => {
            let tx;
            before(async () => {
                await mioTokenInstance.unpause({from: owner});
                tx = await mioTokenInstance.decreaseApproval(anotherAccount, 1, {from: owner});
            });

            it('decreases allowance', async () => {
                (await mioTokenInstance.allowance(owner, anotherAccount)).should.be.bignumber.equal(amount);
            });

            it('emits an approval event', async () => {
                (await mioTokenInstance.allowance(owner, anotherAccount)).should.be.bignumber.equal(amount);

                const approvalEvents = getEvents(tx, 'Approval');
                approvalEvents[0].owner.should.be.equal(owner);
                approvalEvents[0].spender.should.be.equal(anotherAccount);
                approvalEvents[0].value.should.be.bignumber.equal(amount);
            });
        });
    });

    describe('burn', async () => {
        context('when the amount to burn is greater than the balance', async () => {
            it('fails', async () => {
                await expectThrow(mioTokenInstance.burn(totalSupply, {from: owner}));
            });
        });

        context('when the amount to burn is not greater than the balance', async () => {
            let amount;
            let tx;
            let blockNum;
            before(async () => {
                amount = await mioTokenInstance.balanceOf(owner);
                tx = await mioTokenInstance.burn(amount, {from: owner});
                blockNum = web3.eth.blockNumber;
            });

            it('burns the requested amount', async () => {
                (await mioTokenInstance.totalSupplyAt(blockNum)).should.be.bignumber.equal(totalSupply.sub(amount));
                (await mioTokenInstance.totalSupplyAt(blockNum - 1)).should.be.bignumber.equal(totalSupply);

                (await mioTokenInstance.balanceOfAt(owner, blockNum)).should.be.bignumber.equal(0);
                (await mioTokenInstance.balanceOfAt(owner, blockNum - 1)).should.be.bignumber.equal(amount);
            });

            it('emits a burn event', async () => {
                const burnEvents = getEvents(tx, 'Burn');
                burnEvents[0].burner.should.be.equal(owner);
                burnEvents[0].value.should.be.bignumber.equal(amount);
            });

            it('emits a transfer event', async () => {
                const transferEvents = getEvents(tx, 'Transfer');
                transferEvents[0].from.should.be.equal(owner);
                transferEvents[0].to.should.be.equal(zeroAddress);
                transferEvents[0].value.should.be.bignumber.equal(amount);
            });
        });
    });

    describe('reclaimToken', async () => {
        let anotherTokenInstance;
        let blockNum;
        before(async () => {
            anotherTokenInstance = await MioToken.new({from: initialOwner});  // mock of a ERC-20 token
            await anotherTokenInstance.mint(initialOwner, totalSupply, {from: initialOwner});
            await anotherTokenInstance.transfer(mioTokenInstance.address, amount, {from: initialOwner});
            await mioTokenInstance.reclaimToken(anotherTokenInstance.address, {from: owner});
            blockNum = web3.eth.blockNumber;
        });

        it('recovers any ERC-20 token sent to the mioTokenInstance', async () => {
            (await anotherTokenInstance.balanceOfAt(owner, blockNum)).should.be.bignumber.equal(amount);
            (await anotherTokenInstance.balanceOfAt(owner, blockNum - 1)).should.be.bignumber.equal(0);
            (await anotherTokenInstance.balanceOfAt(mioTokenInstance.address, blockNum)).should.be.bignumber.equal(0);
            (await anotherTokenInstance.balanceOfAt(mioTokenInstance.address, blockNum - 1)).should.be.bignumber.equal(amount);
        });
    });
});
