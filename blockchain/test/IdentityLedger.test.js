import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("IdentityLedger", function () {
    let IdentityLedger;
    let ledger;
    let owner;
    let addr1;
    let addr2;

    const validHash = ethers.id("test-aadhaar-1");
    const validHash2 = ethers.id("test-pan-2");

    beforeEach(async function () {
        [owner, addr1, addr2] = await ethers.getSigners();
        IdentityLedger = await ethers.getContractFactory("IdentityLedger");
        ledger = await IdentityLedger.deploy();
    });

    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            expect(await ledger.owner()).to.equal(owner.address);
        });

        it("Should start with zero totalAnchored", async function () {
            expect(await ledger.getTotalAnchored()).to.equal(0);
        });
    });

    describe("anchorDocument", function () {
        it("Should anchor successfully and emit DocumentAnchored", async function () {
            await expect(ledger.anchorDocument(validHash, "aadhaar", "9876"))
                .to.emit(ledger, "DocumentAnchored")
                .withArgs(validHash, "aadhaar", "9876", (v) => v > 0);

            expect(await ledger.getTotalAnchored()).to.equal(1);
        });

        it("Should revert if same hash anchored twice", async function () {
            await ledger.anchorDocument(validHash, "aadhaar", "9876");
            await expect(ledger.anchorDocument(validHash, "aadhaar", "9876"))
                .to.be.revertedWith("Hash already anchored");
        });

        it("Should revert on invalid docType", async function () {
            await expect(ledger.anchorDocument(validHash, "passport", "9876"))
                .to.be.revertedWith("Invalid document type");
        });

        it("Should revert if not called by owner", async function () {
            await expect(ledger.connect(addr1).anchorDocument(validHash, "aadhaar", "9876"))
                .to.be.revertedWith("Not authorized: caller is not the owner");
        });
    });

    describe("verifyDocument", function () {
        it("Should return correct fields for anchored hash", async function () {
            await ledger.anchorDocument(validHash, "pan", "1234");
            const blockNumBefore = await ethers.provider.getBlockNumber();
            const blockBefore = await ethers.provider.getBlock(blockNumBefore);
            const timestampBefore = blockBefore.timestamp;

            const result = await ledger.verifyDocument(validHash);
            expect(result.exists).to.be.true;
            expect(result.isRevoked).to.be.false;
            expect(result.docType).to.equal("pan");
            expect(result.identityRef).to.equal("1234");
            expect(result.anchoredAt).to.be.closeTo(timestampBefore, 10);
            expect(result.revokedAt).to.equal(0);
        });

        it("Should return empty/zero values for unanchored hash", async function () {
            const result = await ledger.verifyDocument(validHash);
            expect(result.exists).to.be.false;
            expect(result.isRevoked).to.be.false;
            expect(result.docType).to.equal("");
            expect(result.identityRef).to.equal("");
            expect(result.anchoredAt).to.equal(0);
            expect(result.revokedAt).to.equal(0);
        });
    });

    describe("revokeDocument", function () {
        it("Should successfully revoke and emit DocumentRevoked", async function () {
            await ledger.anchorDocument(validHash, "voter", "5555");
            await expect(ledger.revokeDocument(validHash))
                .to.emit(ledger, "DocumentRevoked")
                .withArgs(validHash, (v) => v > 0);

            const result = await ledger.verifyDocument(validHash);
            expect(result.isRevoked).to.be.true;
            expect(result.revokedAt).to.be.greaterThan(0);
        });

        it("Should revert if hash not found", async function () {
            await expect(ledger.revokeDocument(validHash))
                .to.be.revertedWith("Hash not found on ledger");
        });

        it("Should revert if already revoked", async function () {
            await ledger.anchorDocument(validHash, "voter", "5555");
            await ledger.revokeDocument(validHash);
            await expect(ledger.revokeDocument(validHash))
                .to.be.revertedWith("Document already revoked");
        });

        it("Should revert if not owner", async function () {
            await ledger.anchorDocument(validHash, "voter", "5555");
            await expect(ledger.connect(addr1).revokeDocument(validHash))
                .to.be.revertedWith("Not authorized: caller is not the owner");
        });
    });

    describe("isHashAnchored & isHashValid", function () {
        it("isHashAnchored works correctly", async function () {
            expect(await ledger.isHashAnchored(validHash)).to.be.false;
            await ledger.anchorDocument(validHash, "aadhaar", "1111");
            expect(await ledger.isHashAnchored(validHash)).to.be.true;
        });

        it("isHashValid works correctly for anchored, revoked, unknown", async function () {
            expect(await ledger.isHashValid(validHash)).to.be.false; // Unknown

            await ledger.anchorDocument(validHash, "aadhaar", "1111");
            expect(await ledger.isHashValid(validHash)).to.be.true; // Anchored, not revoked

            await ledger.revokeDocument(validHash);
            expect(await ledger.isHashValid(validHash)).to.be.false; // Revoked
        });
    });

    describe("transferOwnership", function () {
        it("Should transfer ownership successfully and emit event", async function () {
            await expect(ledger.transferOwnership(addr1.address))
                .to.emit(ledger, "OwnershipTransferred")
                .withArgs(owner.address, addr1.address);

            expect(await ledger.owner()).to.equal(addr1.address);
        });

        it("Should revert on zero address", async function () {
            await expect(ledger.transferOwnership(ethers.ZeroAddress))
                .to.be.revertedWith("New owner is the zero address");
        });

        it("Should revert if caller is not owner", async function () {
            await expect(ledger.connect(addr1).transferOwnership(addr2.address))
                .to.be.revertedWith("Not authorized: caller is not the owner");
        });
    });
});
