import "@stdlib/deploy";

// Message to register a candidate exam outcome
message RecordExamCredential {
    candidate: Address;
    examCore: Int as uint8;
    score: Int as uint16;
    passed: Bool;
    ledgerHash: Int as uint256;
    timestamp: Int as uint32;
}

// On-chain event for transparency and explorer indexing
message ExamCredentialIssued {
    candidate: Address;
    examCore: Int as uint8;
    score: Int as uint16;
    passed: Bool;
    ledgerHash: Int as uint256;
    timestamp: Int as uint32;
}

struct CredentialRecord {
    examCore: Int as uint8;
    score: Int as uint16;
    passed: Bool;
    ledgerHash: Int as uint256;
    timestamp: Int as uint32;
}

/**
 * ExamCredentialRegistry
 * Soulbound Verifiable Credential Registry for Clariora
 * Deployed on TON Blockchain (https://ton.org)
 */
contract ExamCredentialRegistry with Deployable {
    owner: Address;
    totalIssued: Int as uint32;
    // Map: Candidate Address -> (Core -> Credential)
    credentials: map<Address, Cell>;

    init() {
        self.owner = sender();
        self.totalIssued = 0;
    }

    // Accepts credential registration from authorized issuer
    receive(msg: RecordExamCredential) {
        // Enforce access control: only contract owner (authorized Clariora backend) may record credentials
        require(sender() == self.owner, "Unauthorized credential issuer");

        // Enforce passing mark check (675 for Core 1, 700 for Core 2)
        require(msg.passed == true, "Cannot mint failing score as credential");
        if (msg.examCore == 1) {
            require(msg.score >= 675, "Core 1 score below passing mark of 675");
        } else {
            require(msg.score >= 700, "Core 2 score below passing mark of 700");
        }

        self.totalIssued = self.totalIssued + 1;

        // Emit on-chain event
        emit(ExamCredentialIssued{
            candidate: msg.candidate,
            examCore: msg.examCore,
            score: msg.score,
            passed: msg.passed,
            ledgerHash: msg.ledgerHash,
            timestamp: msg.timestamp
        }.toCell());

        // Refund excess TON gas back to sender
        self.reply("APX:RECORDED".asComment());
    }

    // Read total number of certified candidates
    get fun getTotalIssued(): Int {
        return self.totalIssued;
    }

    // Read contract owner
    get fun getOwner(): Address {
        return self.owner;
    }
}
