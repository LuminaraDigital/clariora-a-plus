import "@stdlib/deploy";

/**
 * CrucibleCommitmentPool: Peer commitment study staking on TON Blockchain.
 * Enables study groups to stake TON on a 7-day study streak.
 * Daily quest completions are verified by the Clariora AI Oracle.
 */

struct Participant {
    stakedAmount: Int as coins;
    streakDays: Int as uint8;
    lastStudyDay: Int as uint32;
    completed: Bool;
    claimed: Bool;
}

message StakeCommitment {
    queryId: Int as uint64;
}

message VerifyDailyStudy {
    queryId: Int as uint64;
    student: Address;
    studyDayNumber: Int as uint32;
    oracleSignature: Slice;
}

message ClaimPoolYield {
    queryId: Int as uint64;
}

contract CrucibleCommitmentPool with Deployable {
    owner: Address;
    oracle: Address;
    poolEndTime: Int as uint64;
    totalStaked: Int as coins = 0;
    penaltyPool: Int as coins = 0;
    activeFinishersCount: Int as uint32 = 0;
    participants: map<Address, Participant>;

    init(owner: Address, oracle: Address, durationSeconds: Int as uint64) {
        self.owner = owner;
        self.oracle = oracle;
        self.poolEndTime = now() + durationSeconds;
    }

    receive(msg: StakeCommitment) {
        let ctx: Context = context();
        require(now() < self.poolEndTime - 86400, "Staking period has ended");
        require(ctx.value >= ton("2.0"), "Minimum 2 TON commitment stake required");

        let p: Participant? = self.participants.get(ctx.sender);
        require(p == null, "User has already entered this pool");

        self.participants.set(ctx.sender, Participant{
            stakedAmount: ctx.value,
            streakDays: 1,
            lastStudyDay: now() / 86400,
            completed: false,
            claimed: false
        });

        self.totalStaked = self.totalStaked + ctx.value;
    }

    receive(msg: VerifyDailyStudy) {
        let ctx: Context = context();
        require(ctx.sender == self.oracle, "Only Clariora AI Oracle can attest daily study");

        let pOpt: Participant? = self.participants.get(msg.student);
        require(pOpt != null, "Student not found in pool");
        let p: Participant = pOpt!!;

        let today: Int = now() / 86400;
        if (today > p.lastStudyDay) {
            p.streakDays = p.streakDays + 1;
            p.lastStudyDay = today;
            if (p.streakDays >= 7 && !p.completed) {
                p.completed = true;
                self.activeFinishersCount = self.activeFinishersCount + 1;
            }
            self.participants.set(msg.student, p);
        }
    }

    receive(msg: ClaimPoolYield) {
        let ctx: Context = context();
        require(now() >= self.poolEndTime, "Pool is still active");

        let pOpt: Participant? = self.participants.get(ctx.sender);
        require(pOpt != null, "Not a participant");
        let p: Participant = pOpt!!;
        require(!p.claimed, "Already claimed");

        p.claimed = true;
        self.participants.set(ctx.sender, p);

        if (p.completed && p.streakDays >= 7) {
            // Payout initial stake + split of forfeited penalty pool
            let bonus: Int = 0;
            if (self.activeFinishersCount > 0) {
                bonus = self.penaltyPool / self.activeFinishersCount;
            }
            let payout: Int = p.stakedAmount + bonus;
            send(SendParameters{
                to: ctx.sender,
                value: payout,
                mode: SendRemainingValue,
                bounce: false
            });
        } else {
            // Lapsed streak: stake forfeited into penalty pool
            self.penaltyPool = self.penaltyPool + p.stakedAmount;
        }
    }

    get fun get_pool_info(): (Int, Int, Int, Int) {
        return (self.poolEndTime, self.totalStaked, self.penaltyPool, self.activeFinishersCount);
    }

    get fun get_participant_info(student: Address): Participant? {
        return self.participants.get(student);
    }
}
