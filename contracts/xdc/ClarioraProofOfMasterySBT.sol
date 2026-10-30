// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ClarioraProofOfMasterySBT
 * @notice ERC-5192 compliant Soulbound Token (SBT) for CompTIA A+ and Cloud certification readiness.
 * @dev Non-transferable token permanently bound to the recipient's wallet address.
 * Emits EIP-5192 Locked events and enforces that certificates cannot be transferred or sold.
 * Minting is strictly authorized via an ECDSA cryptographic signature from the Clariora AI Attestation Oracle.
 */

interface IERC5192 {
    event Locked(uint256 tokenId);
    event Unlocked(uint256 tokenId);
    function locked(uint256 tokenId) external view returns (bool);
}

interface IERC165 {
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}

interface IERC721 is IERC165 {
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);

    function balanceOf(address owner) external view returns (uint256 balance);
    function ownerOf(uint256 tokenId) external view returns (address owner);
}

contract ClarioraProofOfMasterySBT is IERC721, IERC5192 {
    string public name = "Clariora Proof of Competence";
    string public symbol = "CPOC";

    address public owner;
    address public oracleSigner; // Public key of Clariora AI Proctor Oracle

    uint256 private _tokenCount;

    struct MasteryRecord {
        string examCode;          // e.g., "220-1201" (Core 1) or "220-1202" (Core 2)
        uint16 scaledScore;       // e.g., 850 (Passing: 675 or 700)
        uint64 certifiedAt;       // Unix timestamp of examination
        bytes32 localLedgerRoot;  // Merkle root hash of the student's on-device ECDSA chain
        string metadataUri;       // IPFS or HTTPS link to cryptographic diagnostic transcript
    }

    mapping(uint256 => address) private _owners;
    mapping(address => uint256) private _balances;
    mapping(uint256 => MasteryRecord) public masteryRecords;
    mapping(bytes32 => bool) public consumedAttestationHashes;

    event CredentialMinted(
        address indexed recipient,
        uint256 indexed tokenId,
        string examCode,
        uint16 scaledScore,
        bytes32 localLedgerRoot
    );
    event OracleUpdated(address indexed oldOracle, address indexed newOracle);
    event OwnershipTransferred(address indexed oldOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "Caller is not contract owner");
        _;
    }

    constructor(address _initialOracle) {
        require(_initialOracle != address(0), "Invalid initial oracle");
        owner = msg.sender;
        oracleSigner = _initialOracle;
    }

    /**
     * @notice Mint a Soulbound Credential using a cryptographic attestation signed by the Clariora AI Oracle.
     */
    function mintWithAttestation(
        string calldata examCode,
        uint16 scaledScore,
        uint64 certifiedAt,
        bytes32 localLedgerRoot,
        string calldata metadataUri,
        bytes calldata oracleSignature
    ) external returns (uint256) {
        uint16 minPassScore = 675;
        bytes memory codeBytes = bytes(examCode);
        if (codeBytes.length > 0 && codeBytes[codeBytes.length - 1] == '2') {
            minPassScore = 700;
        }
        require(scaledScore >= minPassScore, "Exam score does not meet certified passing standard");
        require(certifiedAt <= block.timestamp + 300, "Future timestamp rejected");
        require(block.timestamp <= certifiedAt + 30 days, "Attestation expired");

        // Construct attestation message hash
        bytes32 messageHash = keccak256(
            abi.encodePacked(
                msg.sender,
                examCode,
                scaledScore,
                certifiedAt,
                localLedgerRoot,
                block.chainid
            )
        );

        bytes32 ethSignedHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );

        require(!consumedAttestationHashes[messageHash], "Attestation already redeemed");
        require(recoverSigner(ethSignedHash, oracleSignature) == oracleSigner, "Invalid AI Oracle signature");

        consumedAttestationHashes[messageHash] = true;

        uint256 newTokenId = ++_tokenCount;
        _owners[newTokenId] = msg.sender;
        _balances[msg.sender] += 1;

        masteryRecords[newTokenId] = MasteryRecord({
            examCode: examCode,
            scaledScore: scaledScore,
            certifiedAt: certifiedAt,
            localLedgerRoot: localLedgerRoot,
            metadataUri: metadataUri
        });

        emit Transfer(address(0), msg.sender, newTokenId);
        emit Locked(newTokenId);
        emit CredentialMinted(msg.sender, newTokenId, examCode, scaledScore, localLedgerRoot);

        return newTokenId;
    }

    /**
     * @notice ERC-5192 standard: Soulbound tokens are permanently locked.
     */
    function locked(uint256 tokenId) external view override returns (bool) {
        require(_owners[tokenId] != address(0), "Token does not exist");
        return true; // Permanently locked (Soulbound)
    }

    /**
     * @notice Transfer is strictly prohibited for Soulbound tokens.
     */
    function transferFrom(address, address, uint256) external pure {
        revert("ERC5192: Soulbound token cannot be transferred");
    }

    function safeTransferFrom(address, address, uint256) external pure {
        revert("ERC5192: Soulbound token cannot be transferred");
    }

    function safeTransferFrom(address, address, uint256, bytes calldata) external pure {
        revert("ERC5192: Soulbound token cannot be transferred");
    }

    function approve(address, uint256) external pure {
        revert("ERC5192: Soulbound token cannot be approved for transfer");
    }

    function setApprovalForAll(address, bool) external pure {
        revert("ERC5192: Soulbound token cannot be approved for transfer");
    }

    function getApproved(uint256) external pure returns (address) {
        return address(0);
    }

    function isApprovedForAll(address, address) external pure returns (bool) {
        return false;
    }

    function balanceOf(address account) external view override returns (uint256) {
        require(account != address(0), "Zero address query");
        return _balances[account];
    }

    function ownerOf(uint256 tokenId) external view override returns (address) {
        address tokenOwner = _owners[tokenId];
        require(tokenOwner != address(0), "Token does not exist");
        return tokenOwner;
    }

    function tokenURI(uint256 tokenId) external view returns (string memory) {
        require(_owners[tokenId] != address(0), "Token does not exist");
        return masteryRecords[tokenId].metadataUri;
    }

    function totalSupply() external view returns (uint256) {
        return _tokenCount;
    }

    function supportsInterface(bytes4 interfaceId) external pure override returns (bool) {
        return
            interfaceId == type(IERC165).interfaceId ||
            interfaceId == type(IERC721).interfaceId ||
            interfaceId == type(IERC5192).interfaceId;
    }

    function setOracleSigner(address newOracle) external onlyOwner {
        require(newOracle != address(0), "Invalid oracle address");
        address old = oracleSigner;
        oracleSigner = newOracle;
        emit OracleUpdated(old, newOracle);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid new owner");
        address old = owner;
        owner = newOwner;
        emit OwnershipTransferred(old, newOwner);
    }

    function recoverSigner(bytes32 ethSignedHash, bytes memory signature) internal pure returns (address) {
        require(signature.length == 65, "Invalid signature length");
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := mload(add(signature, 32))
            s := mload(add(signature, 64))
            v := byte(0, mload(add(signature, 96)))
        }
        if (v < 27) v += 27;
        require(v == 27 || v == 28, "Invalid signature v value");
        return ecrecover(ethSignedHash, v, r, s);
    }
}
