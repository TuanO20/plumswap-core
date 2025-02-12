import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

const privateKey = process.env.PRIVATE_KEY;

const config: HardhatUserConfig = {
  solidity: "0.8.28",
  networks: {
    arbSepolia: {
        accounts: [privateKey!], 
        chainId: 421614,
        url: "https://sepolia-rollup.arbitrum.io/rpc", 
    }
  }
};

export default config;
