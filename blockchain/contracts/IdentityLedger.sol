// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract IdentityLedger {
    address public owner;
    uint256 public totalAnchored;

    struct DocumentRecord {
        bytes32 hash;
        string docType;
        string identityRef;
        uint256 anchoredAt;
        bool isRevoked;
        uint256 revokedAt;
    }

    mapping(bytes32 => DocumentRecord) private ledger;

    event DocumentAnchored(bytes32 indexed hash, string docType, string identityRef, uint256 anchoredAt);
    event DocumentRevoked(bytes32 indexed hash, uint256 revokedAt);
    event OwnershipTransferred(address indexed oldOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized: caller is not the owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function anchorDocument(bytes32 hash, string memory docType, string memory identityRef) external onlyOwner {
        require(ledger[hash].anchoredAt == 0, "Hash already anchored");
        
        bool isValidDocType = keccak256(bytes(docType)) == keccak256(bytes("aadhaar")) ||
                              keccak256(bytes(docType)) == keccak256(bytes("pan")) ||
                              keccak256(bytes(docType)) == keccak256(bytes("voter"));
        
        require(isValidDocType, "Invalid document type");

        ledger[hash] = DocumentRecord({
            hash: hash,
            docType: docType,
            identityRef: identityRef,
            anchoredAt: block.timestamp,
            isRevoked: false,
            revokedAt: 0
        });

        totalAnchored++;
        emit DocumentAnchored(hash, docType, identityRef, block.timestamp);
    }

    function verifyDocument(bytes32 hash) external view returns (
        bool exists,
        bool isRevoked,
        string memory docType,
        string memory identityRef,
        uint256 anchoredAt,
        uint256 revokedAt
    ) {
        DocumentRecord memory record = ledger[hash];
        exists = record.anchoredAt != 0;
        
        if (!exists) {
            return (false, false, "", "", 0, 0);
        }

        return (
            true,
            record.isRevoked,
            record.docType,
            record.identityRef,
            record.anchoredAt,
            record.revokedAt
        );
    }

    function revokeDocument(bytes32 hash) external onlyOwner {
        require(ledger[hash].anchoredAt != 0, "Hash not found on ledger");
        require(!ledger[hash].isRevoked, "Document already revoked");

        ledger[hash].isRevoked = true;
        ledger[hash].revokedAt = block.timestamp;

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

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "New owner is the zero address");
        address oldOwner = owner;
        owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
}
