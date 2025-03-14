import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { getCreate2Address } from "./shared/utilities";
import { Factory, Pair } from "../typechain-types";


// Tuple in TS
const TEST_ADDRESSES : [string, string] = [
    "0x1000000000000000000000000000000000000000",
    "0x2000000000000000000000000000000000000000",
];

describe("Factory Test", () => {
    async function fixture() {
        const contract = await ethers.getContractFactory("Factory");
        const [signer, wallet1] = await ethers.getSigners();
        // signer.address is now _feeToSetter
        const factory = await contract.deploy(signer.address);
        return {factory, signer, wallet1};
    }

    it("Test initial value of feeTo, feeToSetter, allPairsLength", async () => {
        const {factory, signer} = await loadFixture(fixture);

        const feeTo = await factory.feeTo();
        const feeToSetter = await factory.feeToSetter();
        const allPairsLength = await factory.allPairsLength();

        // console.log(feeTo);
        // console.log(feeToSetter);
        // console.log(allPairsLength);

        expect(feeTo).to.eq(ethers.ZeroAddress);
        expect(feeToSetter).to.eq(signer.address);
        expect(allPairsLength).to.eq(0);
    })

    it("Test setFeeTo()", async () => {
        const {factory, signer, wallet1} = await loadFixture(fixture);

        await factory.setFeeTo(wallet1.address);
        const feeTo = await factory.feeTo();
        expect(feeTo).to.eq(wallet1.address);

        // Test changing authorities
        await expect(factory.connect(wallet1).setFeeTo(wallet1.address)).to.be.revertedWith("UniswapV2: FORBIDDEN");
    })

    it("Test setFeeToSetter()", async () => {
        const {factory, signer, wallet1} = await loadFixture(fixture);

        // Test changing authorities
        await expect(factory.connect(wallet1).setFeeToSetter(wallet1.address)).to.be.revertedWith("UniswapV2: FORBIDDEN");

        await factory.setFeeToSetter(wallet1.address);
        const feeToSetter = await factory.feeToSetter();
        expect(feeToSetter).to.eq(wallet1.address);
    })


    async function createPair(
        factory: Factory,
        tokens: [string, string],
      ) {
        const pairContract = await ethers.getContractFactory("Pair");
        const factoryAddress = await factory.getAddress();
        const create2Address = getCreate2Address(
          factoryAddress,
          tokens,
          pairContract.bytecode,
        );
        await expect(factory.createPair(tokens[0], tokens[1]))
          .to.emit(factory, "PairCreated")
          .withArgs(TEST_ADDRESSES[0], TEST_ADDRESSES[1], create2Address, 1);
    
        await expect(factory.createPair(tokens[0], tokens[1])).to.be.reverted; // UniswapV2: PAIR_EXISTS
        await expect(factory.createPair(tokens[1], tokens[0])).to.be.reverted; // UniswapV2: PAIR_EXISTS
        expect(await factory.getPair(tokens[0], tokens[1])).to.eq(create2Address);
        expect(await factory.getPair(tokens[1], tokens[0])).to.eq(create2Address);
        expect(await factory.allPairs(0)).to.eq(create2Address);
        expect(await factory.allPairsLength()).to.eq(1);
    
        const pair = pairContract.attach(create2Address) as Pair;
        expect(await pair.factory()).to.eq(factoryAddress);
        expect(await pair.token0()).to.eq(TEST_ADDRESSES[0]);
        expect(await pair.token1()).to.eq(TEST_ADDRESSES[1]);
      }
    
    it("Pair:codeHash", async () => {
        const { factory } = await loadFixture(fixture);
        const codehash = await factory.PAIR_HASH();
        const pair = await ethers.getContractFactory("Pair");
        expect(ethers.keccak256(pair.bytecode)).to.be.eq(codehash);
    });
    
      it("createPair", async () => {
        const { factory } = await loadFixture(fixture);
        await createPair(factory, [...TEST_ADDRESSES]);
      });
    
      it("createPair:reverse", async () => {
        const { factory } = await loadFixture(fixture);
        await createPair(
          factory,
          TEST_ADDRESSES.slice().reverse() as [string, string],
        );
      });
    
    //   it("createPair:gas", async () => {
    //     const { factory } = await loadFixture(fixture);
    //     const tx = await factory.createPair(...TEST_ADDRESSES);
    //     const receipt = await tx.wait();
    //     //expect(receipt!.gasUsed).to.eq(2356517);
    //     console.log(receipt?.gasUsed);
    //   });


});