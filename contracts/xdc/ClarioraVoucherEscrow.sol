// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ClarioraVoucherEscrow
 * @notice Enterprise voucher sponsorship escrow for workforce IT training programs on XDC Network.
 * @dev Sponsoring enterprises / IT academies lock exam voucher funding into escrow.
 * Funds or voucher keys are released to apprentices only upon the Clariora AI Oracle verifying
 * that the student has achieved a certified readiness threshold (e.g. >= 85% readiness score).
 */

contract ClarioraVoucherEscrow {
    address public owner;
    address public oracleSigner;

    struct VoucherGrant {
        address sponsor;
        address apprentice;
        uint256 fundedAmount;     // Funded XDC for voucher acquisition
        uint16 targetReadiness;   // Target readiness score (e.g. 850 for 85%)
        uint64 expiryTimestamp;
        bool claimed;
        bool refunded;
        string voucherCodeCipher; // Encrypted voucher code unlockable by apprentice
    }

    mapping(bytes32 => VoucherGrant) public grants;

    event GrantFunded(
        bytes32 indexed grantId,
        address indexed sponsor,
        address indexed apprentice,
        uint256 fundedAmount,
        uint16 targetReadiness
    );
    event GrantClaimed(bytes32 indexed grantId, address indexed apprentice);
    event GrantRefunded(bytes32 indexed grantId, address indexed sponsor);

    modifier onlyOwner() {
        require(msg.sender == owner, "Caller is not owner");
        _;
    }

    constructor(address _oracleSigner) {
        require(_oracleSigner != address(0), "Invalid oracle");
        owner = msg.sender;
        oracleSigner = _oracleSigner;
    }

    /**
     * @notice Sponsor funds an exam voucher grant for an apprentice.
     */
    function fundGrant(
        bytes32 grantId,
        address apprentice,
        uint16 targetReadiness,
        uint64 validityDuration,
        string calldata voucherCodeCipher
    ) external payable {
        require(msg.value > 0, "Funding must be greater than zero");
        require(apprentice != address(0), "Invalid apprentice");
        require(grants[grantId].sponsor == address(0), "Grant ID already exists");

        grants[grantId] = VoucherGrant({
            sponsor: msg.sender,
            apprentice: apprentice,
            fundedAmount: msg.value,
            targetReadiness: targetReadiness,
            expiryTimestamp: uint64(block.timestamp + validityDuration),
            claimed: false,
            refunded: false,
            voucherCodeCipher: voucherCodeCipher
        });

        emit GrantFunded(grantId, msg.sender, apprentice, msg.value, targetReadiness);
    }

    /**
     * @notice Apprentice claims the escrowed voucher upon presenting an AI Oracle readiness attestation.
     */
    function claimGrant(
        bytes32 grantId,
        uint16 verifiedReadiness,
        uint64 attestationTime,
        bytes calldata oracleSignature
    ) external {
        VoucherGrant storage grant = grants[grantId];
        require(msg.sender == grant.apprentice, "Caller is not the designated apprentice");
        require(!grant.claimed && !grant.refunded, "Grant not available");
        require(block.timestamp <= grant.expiryTimestamp, "Grant has expired");
        require(verifiedReadiness >= grant.targetReadiness, "Readiness threshold not reached");

        bytes32 messageHash = keccak256(
            abi.encodePacked(
                grantId,
                grant.apprentice,
                verifiedReadiness,
                attestationTime,
                block.chainid
            )
        );

        bytes32 ethSignedHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );

        require(recoverSigner(ethSignedHash, oracleSignature) == oracleSigner, "Invalid Oracle signature");

        grant.claimed = true;

        (bool sent, ) = payable(grant.apprentice).call{value: grant.fundedAmount}("");
        require(sent, "Apprentice payout failed");

        emit GrantClaimed(grantId, grant.apprentice);
    }

    /**
     * @notice Sponsor reclaims unspent funds if apprentice fails to meet threshold before expiry.
     */
    function refundExpiredGrant(bytes32 grantId) external {
        VoucherGrant storage grant = grants[grantId];
        require(msg.sender == grant.sponsor || msg.sender == owner, "Unauthorized");
        require(!grant.claimed && !grant.refunded, "Already settled");
        require(block.timestamp > grant.expiryTimestamp, "Grant not yet expired");

        grant.refunded = true;

        (bool sent, ) = payable(grant.sponsor).call{value: grant.fundedAmount}("");
        require(sent, "Sponsor refund failed");

        emit GrantRefunded(grantId, grant.sponsor);
    }

    function setOracleSigner(address newOracle) external onlyOwner {
        require(newOracle != address(0), "Invalid oracle");
        oracleSigner = newOracle;
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
