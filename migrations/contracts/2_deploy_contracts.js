const MioToken = artifacts.require('MioToken');
const TokenVault = artifacts.require('TokenVault');

module.exports = function (deployer) {
    const releaseTime = 1601807651; // Sunday, 4 October 2020 10:34:11

    deployer.deploy(MioToken)
        .then(() => {
            return MioToken.deployed()
                .then((mioTokenInstance) => {
                    mioTokenAddress = mioTokenInstance.address;
                    console.log('[ mioTokenInstance.address ]: ' + mioTokenAddress);

                    return deployer.deploy(TokenVault, mioTokenAddress, releaseTime)
                        .then(() => {
                            return TokenVault.deployed()
                                .then((tokenVaultInstance) => {
                                    tokenVaultAddress = tokenVaultInstance.address;
                                    console.log('[ tokenVaultInstance.address ]: ' + tokenVaultAddress);
                                });
                        });
                });
        });
};
