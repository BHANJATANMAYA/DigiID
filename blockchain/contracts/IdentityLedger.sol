// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract IdentityLedger {
    address public owner;
    uint256 public totalAnchored;   // Historical count — never decrements
    uint256 public totalActive;     // Active (non-revoked) count

    // Gas-efficient enum instead of string comparison
    enum DocType { Aadhaar, Pan, Voter }

    struct DocumentRecord {
        bytes32 hash;
        DocType docType;
        uint256 anchoredAt;
        bool isRevoked;
        uint256 revokedAt;
    }

    mapping(bytes32 => DocumentRecord) private ledger;

    event DocumentAnchored(bytes32 indexed hash, DocType docType, uint256 anchoredAt);
    event DocumentRevoked(bytes32 indexed hash, uint256 revokedAt);
    event OwnershipTransferred(address indexed oldOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized: caller is not the owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function anchorDocument(bytes32 hash, DocType docType) external onlyOwner {
        require(ledger[hash].anchoredAt == 0, "Hash already anchored");

        ledger[hash] = DocumentRecord({
            hash: hash,
            docType: docType,
            anchoredAt: block.timestamp,
            isRevoked: false,
            revokedAt: 0
        });

        totalAnchored++;
        totalActive++;
        emit DocumentAnchored(hash, docType, block.timestamp);
    }

    function verifyDocument(bytes32 hash) external view returns (
        bool exists,
        bool isRevoked,
        DocType docType,
        uint256 anchoredAt,
        uint256 revokedAt
    ) {
        DocumentRecord memory record = ledger[hash];
        exists = record.anchoredAt != 0;

        if (!exists) {
            return (false, false, DocType.Aadhaar, 0, 0);
        }

        return (
            true,
            record.isRevoked,
            record.docType,
            record.anchoredAt,
            record.revokedAt
        );
    }

    function revokeDocument(bytes32 hash) external onlyOwner {
        require(ledger[hash].anchoredAt != 0, "Hash not found on ledger");
        require(!ledger[hash].isRevoked, "Document already revoked");

        ledger[hash].isRevoked = true;
        ledger[hash].revokedAt = block.timestamp;
        totalActive--;

        emit DocumentRevoked(hash, block.timestamp);
    }

    function isHashAnchored(bytes32 hash) external view returns (bool) {
        return ledger[hash].anchoredAt != 0;
    }

    function isHashValid(bytes32 hash) external view returns (bool) {
        return ledger[hash].anchoredAt != 0 && !ledger[hash].isRevoked;
    }

    function getTotalAnchored() external view returns (uint256) {
        return totalAnchored;
    }

    function getTotalActive() external view returns (uint256) {
        return totalActive;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "New owner is the zero address");
        address oldOwner = owner;
        owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
}
