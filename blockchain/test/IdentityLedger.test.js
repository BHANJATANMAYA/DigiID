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

    // Enum values matching the Solidity enum DocType
    const DocType = { Aadhaar: 0, Pan: 1, Voter: 2 };

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

        it("Should start with zero totalActive", async function () {
            expect(await ledger.getTotalActive()).to.equal(0);
        });
    });

    describe("anchorDocument", function () {
        it("Should anchor successfully and emit DocumentAnchored", async function () {
            await expect(ledger.anchorDocument(validHash, DocType.Aadhaar))
                .to.emit(ledger, "DocumentAnchored")
                .withArgs(validHash, DocType.Aadhaar, (v) => v > 0);

            expect(await ledger.getTotalAnchored()).to.equal(1);
            expect(await ledger.getTotalActive()).to.equal(1);
        });

        it("Should revert if same hash anchored twice", async function () {
            await ledger.anchorDocument(validHash, DocType.Aadhaar);
            await expect(ledger.anchorDocument(validHash, DocType.Aadhaar))
                .to.be.revertedWith("Hash already anchored");
        });

        it("Should accept all valid doc types", async function () {
            const hash1 = ethers.id("doc-aadhaar");
            const hash2 = ethers.id("doc-pan");
            const hash3 = ethers.id("doc-voter");

            await ledger.anchorDocument(hash1, DocType.Aadhaar);
            await ledger.anchorDocument(hash2, DocType.Pan);
            await ledger.anchorDocument(hash3, DocType.Voter);

            expect(await ledger.getTotalAnchored()).to.equal(3);
            expect(await ledger.getTotalActive()).to.equal(3);
        });

        it("Should revert if not called by owner", async function () {
            await expect(ledger.connect(addr1).anchorDocument(validHash, DocType.Aadhaar))
                .to.be.revertedWith("Not authorized: caller is not the owner");
        });
    });

    describe("verifyDocument", function () {
        it("Should return correct fields for anchored hash", async function () {
            await ledger.anchorDocument(validHash, DocType.Pan);
            const blockNumBefore = await ethers.provider.getBlockNumber();
            const blockBefore = await ethers.provider.getBlock(blockNumBefore);
            const timestampBefore = blockBefore.timestamp;

            const result = await ledger.verifyDocument(validHash);
            expect(result.exists).to.be.true;
            expect(result.isRevoked).to.be.false;
            expect(result.docType).to.equal(DocType.Pan);
            expect(result.anchoredAt).to.be.closeTo(timestampBefore, 10);
            expect(result.revokedAt).to.equal(0);
        });

        it("Should return empty/zero values for unanchored hash", async function () {
            const result = await ledger.verifyDocument(validHash);
            expect(result.exists).to.be.false;
            expect(result.isRevoked).to.be.false;
            expect(result.docType).to.equal(DocType.Aadhaar); // default enum value
            expect(result.anchoredAt).to.equal(0);
            expect(result.revokedAt).to.equal(0);
        });
    });

    describe("revokeDocument", function () {
        it("Should successfully revoke, emit event, and decrement totalActive", async function () {
            await ledger.anchorDocument(validHash, DocType.Voter);
            expect(await ledger.getTotalActive()).to.equal(1);

            await expect(ledger.revokeDocument(validHash))
                .to.emit(ledger, "DocumentRevoked")
                .withArgs(validHash, (v) => v > 0);

            const result = await ledger.verifyDocument(validHash);
            expect(result.isRevoked).to.be.true;
            expect(result.revokedAt).to.be.greaterThan(0);

            // Issue #8: totalActive should decrement, totalAnchored should not
            expect(await ledger.getTotalAnchored()).to.equal(1);
            expect(await ledger.getTotalActive()).to.equal(0);
        });

        it("Should revert if hash not found", async function () {
            await expect(ledger.revokeDocument(validHash))
                .to.be.revertedWith("Hash not found on ledger");
        });

        it("Should revert if already revoked", async function () {
            await ledger.anchorDocument(validHash, DocType.Voter);
            await ledger.revokeDocument(validHash);
            await expect(ledger.revokeDocument(validHash))
                .to.be.revertedWith("Document already revoked");
        });

        it("Should revert if not owner", async function () {
            await ledger.anchorDocument(validHash, DocType.Voter);
            await expect(ledger.connect(addr1).revokeDocument(validHash))
                .to.be.revertedWith("Not authorized: caller is not the owner");
        });
    });

    describe("isHashAnchored & isHashValid", function () {
        it("isHashAnchored works correctly", async function () {
            expect(await ledger.isHashAnchored(validHash)).to.be.false;
            await ledger.anchorDocument(validHash, DocType.Aadhaar);
            expect(await ledger.isHashAnchored(validHash)).to.be.true;
        });

        it("isHashValid works correctly for anchored, revoked, unknown", async function () {
            expect(await ledger.isHashValid(validHash)).to.be.false; // Unknown

            await ledger.anchorDocument(validHash, DocType.Aadhaar);
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
