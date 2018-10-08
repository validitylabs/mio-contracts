/**
 * Test for TokenVault
 *
 * @author Validity Labs AG <info@validitylabs.org>
 */

import increaseTime, {expectThrow, BigNumber, duration, latestTime} from '../helpers/tools';

const MioToken = artifacts.require('./MioToken');
const TokenVault = artifacts.require('./TokenVault');

require('chai')
    .use(require('chai-as-promised'))
    .use(require('chai-bignumber')(BigNumber))
    .should();

/**
 * TokenVault contract
 */
contract('TokenVault', ([owner, beneficiary1, beneficiary2, beneficiary3, beneficiary4, anotherAccount]) => {
    const amount = new BigNumber(10);

    let realeaseTime;
    let mioTokenInstance;
    let tokenVaultInstance;

    describe('deployment', () => {
        before(async () => {
            mioTokenInstance = await MioToken.new();
            await mioTokenInstance.mint(beneficiary1, amount * 3, {from: owner});
            await mioTokenInstance.mint(beneficiary3, amount, {from: owner});
            await mioTokenInstance.mint(beneficiary4, amount, {from: owner});
        });
        context('when release time is in the past', () => {
            let pastRealeaseTime;
            before(async () => {
                pastRealeaseTime = (await latestTime()) - duration.years(2);
            });

            it('fails', async () => {
                await expectThrow(TokenVault.new(mioTokenInstance.address, pastRealeaseTime));
            });
        });

        context('when release time is in the future', () => {
            before(async () => {
                realeaseTime = (await latestTime()) + duration.years(2);
            });

            it('deploys successfully', async () => {
                tokenVaultInstance = await TokenVault.new(mioTokenInstance.address, realeaseTime);
                assert.isDefined(tokenVaultInstance);
            });

            it('has a state', async () => {
                (await tokenVaultInstance.token()).should.equal(mioTokenInstance.address);
                (await tokenVaultInstance.releaseTime()).should.be.bignumber.equal(realeaseTime);
            });
        });
    });

    describe('addBalanceFor', () => {
        before(async () => {
            await mioTokenInstance.approve(tokenVaultInstance.address, amount * 3, {from: beneficiary1});
            await mioTokenInstance.approve(tokenVaultInstance.address, amount, {from: beneficiary3});
            await mioTokenInstance.approve(tokenVaultInstance.address, amount, {from: beneficiary4});
            await tokenVaultInstance.addBalanceFor(beneficiary2, amount, {from: beneficiary1});
        });

        it('transfers the amount of tokens to the vault contract', async () => {
            (await mioTokenInstance.balanceOf(tokenVaultInstance.address)).should.be.bignumber.equal(amount);
            (await mioTokenInstance.balanceOf(beneficiary1)).should.be.bignumber.equal(amount * 2);
        });

        it('updates locked balance for the specified beneficiary in the vault contract', async () => {
            (await tokenVaultInstance.getLockedBalance(beneficiary2)).should.be.bignumber.equal(amount);

            await tokenVaultInstance.addBalanceFor(beneficiary2, amount, {from: beneficiary1});

            (await tokenVaultInstance.getLockedBalance(beneficiary2)).should.be.bignumber.equal(amount * 2);
        });
    });

    describe('addBalance', () => {
        before(async () => {
            await tokenVaultInstance.addBalance(amount, {from: beneficiary1});
            await tokenVaultInstance.addBalance(amount, {from: beneficiary3});
            await tokenVaultInstance.addBalance(amount, {from: beneficiary4});
        });

        it('transfers the amount of tokens to the vault contract', async () => {
            (await mioTokenInstance.balanceOf(tokenVaultInstance.address)).should.be.bignumber.equal(amount * 5);
            (await mioTokenInstance.balanceOf(beneficiary1)).should.be.bignumber.equal(0);
            (await mioTokenInstance.balanceOf(beneficiary3)).should.be.bignumber.equal(0);
            (await mioTokenInstance.balanceOf(beneficiary4)).should.be.bignumber.equal(0);
        });

        it('updates locked balance for the caller in the vault contract', async () => {
            (await tokenVaultInstance.getLockedBalance(beneficiary1)).should.be.bignumber.equal(amount);
            (await tokenVaultInstance.getLockedBalance(beneficiary3)).should.be.bignumber.equal(amount);
            (await tokenVaultInstance.getLockedBalance(beneficiary4)).should.be.bignumber.equal(amount);
        });
    });

    describe('releaseFor', () => {
        before(async () => {

        });

        context('when release time hasn\'t been reached yet', () => {
            it('fails', async () => {
                await expectThrow(tokenVaultInstance.releaseFor(beneficiary3, {from: anotherAccount}));
            });
        });

        context('when release time has been reached', () => {
            before(async () => {
                await increaseTime(realeaseTime + duration.seconds(1));
            });

            context('when the specified beneficiary has no locked balance', () => {
                it('fails', async () => {
                    await expectThrow(tokenVaultInstance.releaseFor(anotherAccount, {from: owner}));
                });
            });

            context('when the specified beneficiary has locked balance', () => {
                before(async () => {
                    await tokenVaultInstance.releaseFor(beneficiary3, {from: anotherAccount});
                });

                it('releases the locked tokens for the specified beneficiary', async () => {
                    (await mioTokenInstance.balanceOf(beneficiary3)).should.be.bignumber.equal(amount);
                    (await tokenVaultInstance.getLockedBalance(beneficiary3)).should.be.bignumber.equal(0);

                    (await mioTokenInstance.balanceOf(tokenVaultInstance.address)).should.be.bignumber.equal(amount * 4);
                });
            });
        });
    });

    describe('release', () => {
        before(async () => {
            await tokenVaultInstance.release({from: beneficiary4});
        });

        it('releases the locked tokens for the caller', async () => {
            (await mioTokenInstance.balanceOf(beneficiary4)).should.be.bignumber.equal(amount);
            (await tokenVaultInstance.getLockedBalance(beneficiary4)).should.be.bignumber.equal(0);

            (await mioTokenInstance.balanceOf(tokenVaultInstance.address)).should.be.bignumber.equal(amount * 3);
        });
    });

    describe('batchRelease', () => {
        before(async () => {
            await tokenVaultInstance.batchRelease([beneficiary1, beneficiary2]);
        });

        it('releases the locked tokens for each beneficiary', async () => {
            (await mioTokenInstance.balanceOf(beneficiary1)).should.be.bignumber.equal(amount);
            (await tokenVaultInstance.getLockedBalance(beneficiary1)).should.be.bignumber.equal(0);

            (await mioTokenInstance.balanceOf(beneficiary2)).should.be.bignumber.equal(amount * 2);
            (await tokenVaultInstance.getLockedBalance(beneficiary2)).should.be.bignumber.equal(0);

            (await mioTokenInstance.balanceOf(tokenVaultInstance.address)).should.be.bignumber.equal(0);
        });
    });
});
