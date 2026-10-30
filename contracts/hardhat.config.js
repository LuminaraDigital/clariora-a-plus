/**
 * Hardhat configuration for deploying Clariora smart contracts to XDC Network.
 * Supports XDC Mainnet (Chain ID 50) and XDC Apothem Testnet (Chain ID 51).
 */
require("@nomicfoundation/hardhat-toolbox");

const PRIVATE_KEY = process.env.XDC_DEPLOYER_PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000001";

module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    xdc_mainnet: {
      url: "https://rpc.xinfin.network",
      chainId: 50,
      accounts: [PRIVATE_KEY]
    },
    xdc_apothem: {
      url: "https://rpc.apothem.network",
      chainId: 51,
      accounts: [PRIVATE_KEY]
    }
  },
  paths: {
    sources: "./xdc",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};
