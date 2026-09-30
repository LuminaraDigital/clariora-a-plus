import "@stdlib/deploy";

/**
 * TEP-85: Soulbound Tokens (SBT) implementation for Clariora A+ on TON Blockchain.
 * Non-transferable digital credentials proving certified exam mastery.
 */

message MintMasterySBT {
    queryId: Int as uint64;
    recipient: Address;
    examCode: String;
    scaledScore: Int as uint16;
    ledgerHash: Int as uint256;
    metadataUri: String;
}

message ProveOwnership {
    queryId: Int as uint64;
    dest: Address;
    forwardPayload: Cell;
    withContent: Bool;
}

message OwnershipProof {
    queryId: Int as uint64;
    itemId: Int as uint64;
    owner: Address;
    data: Cell;
    revokedAt: Int as uint64;
    content: Cell?;
}

message RevokeSBT {
    queryId: Int as uint64;
}

contract ClarioraMasterySBTCollection with Deployable {
    owner: Address;
    oracle: Address;
    nextItemIndex: Int as uint64 = 0;
    collectionContent: Cell;

    init(owner: Address, oracle: Address, collectionContent: Cell) {
        self.owner = owner;
        self.oracle = oracle;
        self.collectionContent = collectionContent;
    }

    receive(msg: MintMasterySBT) {
        let ctx: Context = context();
        require(ctx.sender == self.oracle || ctx.sender == self.owner, "Unauthorized mint");

        let itemInit: StateInit = initOf ClarioraMasterySBTItem(
            myAddress(),
            self.nextItemIndex,
            msg.recipient,
            self.oracle,
            msg.examCode,
            msg.scaledScore,
            msg.ledgerHash
        );

        let itemAddress: Address = contractAddress(itemInit);

        send(SendParameters{
            to: itemAddress,
            value: ton("0.05"),
            mode: SendIgnoreErrors,
            bounce: false,
            code: itemInit.code,
            data: itemInit.data,
            body: "init".asComment()
        });

        self.nextItemIndex = self.nextItemIndex + 1;
    }

    get fun get_collection_data(): (Int, Cell, Address) {
        return (self.nextItemIndex, self.collectionContent, self.owner);
    }

    get fun get_nft_address_by_index(index: Int): Address {
        let itemInit: StateInit = initOf ClarioraMasterySBTItem(
            myAddress(),
            index,
            myAddress(),
            self.oracle,
            "",
            0,
            0
        );
        return contractAddress(itemInit);
    }
}

contract ClarioraMasterySBTItem {
    collection: Address;
    index: Int as uint64;
    owner: Address;
    authority: Address;
    examCode: String;
    scaledScore: Int as uint16;
    ledgerHash: Int as uint256;
    revokedAt: Int as uint64 = 0;

    init(collection: Address, index: Int as uint64, owner: Address, authority: Address, examCode: String, scaledScore: Int as uint16, ledgerHash: Int as uint256) {
        self.collection = collection;
        self.index = index;
        self.owner = owner;
        self.authority = authority;
        self.examCode = examCode;
        self.scaledScore = scaledScore;
        self.ledgerHash = ledgerHash;
    }

    // TEP-85 Requirement: Non-transferability
    receive("transfer") {
        revert(1001); // Transfers strictly forbidden for Soulbound credentials
    }

    receive(msg: ProveOwnership) {
        let ctx: Context = context();
        require(ctx.sender == self.owner, "Only owner can prove ownership");

        send(SendParameters{
            to: msg.dest,
            value: 0,
            mode: SendRemainingValue,
            body: OwnershipProof{
                queryId: msg.queryId,
                itemId: self.index,
                owner: self.owner,
                data: emptyCell(),
                revokedAt: self.revokedAt,
                content: null
            }.toCell()
        });
    }

    receive(msg: RevokeSBT) {
        let ctx: Context = context();
        require(ctx.sender == self.authority, "Only authority can revoke");
        require(self.revokedAt == 0, "Already revoked");
        self.revokedAt = now();
    }

    // TEP-85 Self-destruction option by owner
    receive("destroy") {
        let ctx: Context = context();
        require(ctx.sender == self.owner, "Only owner can destroy");
        send(SendParameters{
            to: self.owner,
            value: 0,
            mode: SendRemainingBalance + SendDestroyIfZero,
            body: "destroyed".asComment()
        });
    }

    get fun get_nft_data(): (Bool, Int, Address, Address, Cell) {
        return (self.revokedAt == 0, self.index, self.collection, self.owner, emptyCell());
    }

    get fun get_authority_address(): Address {
        return self.authority;
    }

    get fun get_revoked_time(): Int {
        return self.revokedAt;
    }

    get fun get_mastery_record(): (String, Int, Int) {
        return (self.examCode, self.scaledScore, self.ledgerHash);
    }
}
