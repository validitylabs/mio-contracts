const MioToken = artifacts.require('MioToken');

module.exports = function (deployer) {
    deployer.deploy(MioToken).then(() => {
        return MioToken.deployed()
            .then((mioTokenInstance) => {
                mioTokenAddress = mioTokenInstance.address;
                console.log('[ mioTokenInstance.address ]: ' + mioTokenAddress);
            });
    });
};
