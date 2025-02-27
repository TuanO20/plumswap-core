import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expandTo18Decimals, UniswapVersion } from "./shared/utilities";

const TOTAL_SUPPLY = expandTo18Decimals(1000);
const TEST_AMOUNT = expandTo18Decimals(100);


describe("ERC20 Test", () => {
    // Prepare before tests
    async function fixture() {
        // Call the inherited contract TestERC20 instead of ERC20
        const contract = await ethers.getContractFactory("TestERC20");
        const token = await contract.deploy(TOTAL_SUPPLY);
        const [signer, user1] = await ethers.getSigners();

        return {token, signer, user1};
    }

    // First test case
    it("Check name, symbol, decimals, totalSupply, balanceOf, DOMAIN_SEPARATOR and PERMIT_TYPEHASH", async() => {
        const {token, signer} = await loadFixture(fixture);

        //console.log(token.target);
        //console.log(signer.address);

        const name = await token.name();
        const symbol = await token.symbol();
        const decimals = await token.decimals(); 
        const totalSupply = await token.totalSupply();
        const balanceOf = await token.balanceOf(signer.address);
        const DOMAIN_SEPARATOR = await token.DOMAIN_SEPARATOR();
        const PERMIT_TYPEHASH = await token.PERMIT_TYPEHASH();

        const { chainId } = await signer.provider.getNetwork();

        //console.log(token.target, await token.getAddress());

        expect(name).to.eq("Uniswap V2");
        expect(symbol).to.eq("UNI-V2");
        expect(decimals).to.eq(18);
        expect(totalSupply).to.eq(TOTAL_SUPPLY);
        expect(balanceOf).to.eq(TOTAL_SUPPLY);
        expect(DOMAIN_SEPARATOR).to.eq(
            ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(
                ["bytes32", "bytes32", "bytes32", "uint256", "address"],
                [
                    ethers.keccak256(ethers.toUtf8Bytes("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)")),
                    ethers.keccak256(ethers.toUtf8Bytes(name)),
                    ethers.keccak256(ethers.toUtf8Bytes(UniswapVersion)),
                    chainId,
                    token.target
                ]
            ))
        );
        expect(PERMIT_TYPEHASH).to.eq(
            ethers.keccak256(
                ethers.toUtf8Bytes("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)")
            )
        );

    });




    // Second test case
    it("Check approve function", async () => {
        const {token, signer, user1} = await loadFixture(fixture);

        // Use .to.emit().withArgs() to check if the event is emitted with the correct arguments
        await expect(token.approve(user1.address, TEST_AMOUNT)).to.emit(token, "Approval").withArgs(signer.address, user1.address, TEST_AMOUNT);
        const allowance = await token.allowance(signer.address, user1.address);
        expect(allowance).to.eq(TEST_AMOUNT);
    });


    // Third test case
    it("Check transfer function", async () => {
        const {token, signer, user1} = await loadFixture(fixture);

        // Check event Transfer
        await expect(token.transfer(user1.address, TEST_AMOUNT)).to.emit(token, "Transfer").withArgs(signer.address, user1.address, TEST_AMOUNT);
        const balanceOfSigner = await token.balanceOf(signer.address);
        const balanceOfUser1 = await token.balanceOf(user1.address);

        // Check balanceOf of signer and user1
        expect(balanceOfSigner).to.eq(TOTAL_SUPPLY - TEST_AMOUNT);
        expect(balanceOfUser1).to.eq(TEST_AMOUNT);
    });


    // Fourth test case
    it("Check transfer fail", async () => {
        const {token, signer, user1} = await loadFixture(fixture);

        // Check if the transfer is reverted when the amount is greater than the balance
        await expect(token.transfer(user1.address, TOTAL_SUPPLY + 10n)).to.be.reverted;
        await expect(token.connect(user1).transfer(signer.address, TEST_AMOUNT)).to.be.reverted;
    });

    // Fifth test case
    it("Check transferFrom function", async () => {
        const {token, signer, user1} = await loadFixture(fixture);

        await token.approve(user1.address, TEST_AMOUNT);
        await expect(token.connect(user1).transferFrom(signer.address, user1.address, TEST_AMOUNT)).to.emit(token, "Transfer").withArgs(signer.address, user1.address, TEST_AMOUNT);

        const allowanceOfSignerAndUser1 = await token.allowance(signer.address, user1.address);
        const balanceOfSigner = await token.balanceOf(signer.address);
        const balanceOfUser1 = await token.balanceOf(user1.address);

        expect(allowanceOfSignerAndUser1).to.eq(0n);
        expect(balanceOfSigner).to.eq(TOTAL_SUPPLY - TEST_AMOUNT);  
        expect(balanceOfUser1).to.eq(TEST_AMOUNT);
    });

    // Sixth test case
    it("Check transferFrom max amount", async () => {
        const {token, signer, user1} = await loadFixture(fixture);

        await token.approve(user1.address, ethers.MaxUint256);
        await expect(token.connect(user1).transferFrom(signer.address, user1.address, TEST_AMOUNT)).to.emit(token, "Transfer").withArgs(signer.address, user1.address, TEST_AMOUNT);
        
        const allowanceOfSignerAndUser1 = await token.allowance(signer.address, user1.address);
        const balanceOfSigner = await token.balanceOf(signer.address);
        const balanceOfUser1 = await token.balanceOf(user1.address);

        expect(allowanceOfSignerAndUser1).to.eq(ethers.MaxUint256);
        expect(balanceOfSigner).to.eq(TOTAL_SUPPLY - TEST_AMOUNT);
        expect(balanceOfUser1).to.eq(TEST_AMOUNT);
    });


    // Seventh test case
    it("Check permit function", async() => {
        const {token, signer, user1} = await loadFixture(fixture);

        const nonce = await token.nonces(signer.address);
        const deadline = ethers.MaxUint256;
        const { chainId } = await signer.provider.getNetwork();
        const tokenName = await token.name();

        const sig = await signer.signTypedData(
        // "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
        {
            name: tokenName,
            version: UniswapVersion,
            chainId: chainId,
            verifyingContract: await token.getAddress(),
        },
        // "Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)"
        {
            Permit: [
            { name: "owner", type: "address" },
            { name: "spender", type: "address" },
            { name: "value", type: "uint256" },
            { name: "nonce", type: "uint256" },
            { name: "deadline", type: "uint256" },
            ],
        },
        {
            owner: signer.address,
            spender: user1.address,
            value: TEST_AMOUNT,
            nonce: nonce,
            deadline: deadline,
        },
        );

        const { r, s, v } = ethers.Signature.from(sig);

        await expect(token.permit(signer.address,user1.address,TEST_AMOUNT,deadline,v,r,s))
            .to.emit(token, "Approval")
            .withArgs(signer.address, user1.address, TEST_AMOUNT);

        expect(await token.allowance(signer.address, user1.address)).to.eq(TEST_AMOUNT);
        expect(await token.nonces(signer.address)).to.eq(1n);
        
    });


});