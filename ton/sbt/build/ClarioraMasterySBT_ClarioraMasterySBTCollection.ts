import {
    Cell,
    Slice,
    Address,
    Builder,
    beginCell,
    ComputeError,
    TupleItem,
    TupleReader,
    Dictionary,
    contractAddress,
    address,
    ContractProvider,
    Sender,
    Contract,
    ContractABI,
    ABIType,
    ABIGetter,
    ABIReceiver,
    TupleBuilder,
    DictionaryValue
} from '@ton/core';

export type DataSize = {
    $$type: 'DataSize';
    cells: bigint;
    bits: bigint;
    refs: bigint;
}

export function storeDataSize(src: DataSize) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeInt(src.cells, 257);
        b_0.storeInt(src.bits, 257);
        b_0.storeInt(src.refs, 257);
    };
}

export function loadDataSize(slice: Slice) {
    const sc_0 = slice;
    const _cells = sc_0.loadIntBig(257);
    const _bits = sc_0.loadIntBig(257);
    const _refs = sc_0.loadIntBig(257);
    return { $$type: 'DataSize' as const, cells: _cells, bits: _bits, refs: _refs };
}

export function loadTupleDataSize(source: TupleReader) {
    const _cells = source.readBigNumber();
    const _bits = source.readBigNumber();
    const _refs = source.readBigNumber();
    return { $$type: 'DataSize' as const, cells: _cells, bits: _bits, refs: _refs };
}

export function loadGetterTupleDataSize(source: TupleReader) {
    const _cells = source.readBigNumber();
    const _bits = source.readBigNumber();
    const _refs = source.readBigNumber();
    return { $$type: 'DataSize' as const, cells: _cells, bits: _bits, refs: _refs };
}

export function storeTupleDataSize(source: DataSize) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.cells);
    builder.writeNumber(source.bits);
    builder.writeNumber(source.refs);
    return builder.build();
}

export function dictValueParserDataSize(): DictionaryValue<DataSize> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeDataSize(src)).endCell());
        },
        parse: (src) => {
            return loadDataSize(src.loadRef().beginParse());
        }
    }
}

export type SignedBundle = {
    $$type: 'SignedBundle';
    signature: Buffer;
    signedData: Slice;
}

export function storeSignedBundle(src: SignedBundle) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeBuffer(src.signature);
        b_0.storeBuilder(src.signedData.asBuilder());
    };
}

export function loadSignedBundle(slice: Slice) {
    const sc_0 = slice;
    const _signature = sc_0.loadBuffer(64);
    const _signedData = sc_0;
    return { $$type: 'SignedBundle' as const, signature: _signature, signedData: _signedData };
}

export function loadTupleSignedBundle(source: TupleReader) {
    const _signature = source.readBuffer();
    const _signedData = source.readCell().asSlice();
    return { $$type: 'SignedBundle' as const, signature: _signature, signedData: _signedData };
}

export function loadGetterTupleSignedBundle(source: TupleReader) {
    const _signature = source.readBuffer();
    const _signedData = source.readCell().asSlice();
    return { $$type: 'SignedBundle' as const, signature: _signature, signedData: _signedData };
}

export function storeTupleSignedBundle(source: SignedBundle) {
    const builder = new TupleBuilder();
    builder.writeBuffer(source.signature);
    builder.writeSlice(source.signedData.asCell());
    return builder.build();
}

export function dictValueParserSignedBundle(): DictionaryValue<SignedBundle> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeSignedBundle(src)).endCell());
        },
        parse: (src) => {
            return loadSignedBundle(src.loadRef().beginParse());
        }
    }
}

export type StateInit = {
    $$type: 'StateInit';
    code: Cell;
    data: Cell;
}

export function storeStateInit(src: StateInit) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeRef(src.code);
        b_0.storeRef(src.data);
    };
}

export function loadStateInit(slice: Slice) {
    const sc_0 = slice;
    const _code = sc_0.loadRef();
    const _data = sc_0.loadRef();
    return { $$type: 'StateInit' as const, code: _code, data: _data };
}

export function loadTupleStateInit(source: TupleReader) {
    const _code = source.readCell();
    const _data = source.readCell();
    return { $$type: 'StateInit' as const, code: _code, data: _data };
}

export function loadGetterTupleStateInit(source: TupleReader) {
    const _code = source.readCell();
    const _data = source.readCell();
    return { $$type: 'StateInit' as const, code: _code, data: _data };
}

export function storeTupleStateInit(source: StateInit) {
    const builder = new TupleBuilder();
    builder.writeCell(source.code);
    builder.writeCell(source.data);
    return builder.build();
}

export function dictValueParserStateInit(): DictionaryValue<StateInit> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeStateInit(src)).endCell());
        },
        parse: (src) => {
            return loadStateInit(src.loadRef().beginParse());
        }
    }
}

export type Context = {
    $$type: 'Context';
    bounceable: boolean;
    sender: Address;
    value: bigint;
    raw: Slice;
}

export function storeContext(src: Context) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeBit(src.bounceable);
        b_0.storeAddress(src.sender);
        b_0.storeInt(src.value, 257);
        b_0.storeRef(src.raw.asCell());
    };
}

export function loadContext(slice: Slice) {
    const sc_0 = slice;
    const _bounceable = sc_0.loadBit();
    const _sender = sc_0.loadAddress();
    const _value = sc_0.loadIntBig(257);
    const _raw = sc_0.loadRef().asSlice();
    return { $$type: 'Context' as const, bounceable: _bounceable, sender: _sender, value: _value, raw: _raw };
}

export function loadTupleContext(source: TupleReader) {
    const _bounceable = source.readBoolean();
    const _sender = source.readAddress();
    const _value = source.readBigNumber();
    const _raw = source.readCell().asSlice();
    return { $$type: 'Context' as const, bounceable: _bounceable, sender: _sender, value: _value, raw: _raw };
}

export function loadGetterTupleContext(source: TupleReader) {
    const _bounceable = source.readBoolean();
    const _sender = source.readAddress();
    const _value = source.readBigNumber();
    const _raw = source.readCell().asSlice();
    return { $$type: 'Context' as const, bounceable: _bounceable, sender: _sender, value: _value, raw: _raw };
}

export function storeTupleContext(source: Context) {
    const builder = new TupleBuilder();
    builder.writeBoolean(source.bounceable);
    builder.writeAddress(source.sender);
    builder.writeNumber(source.value);
    builder.writeSlice(source.raw.asCell());
    return builder.build();
}

export function dictValueParserContext(): DictionaryValue<Context> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeContext(src)).endCell());
        },
        parse: (src) => {
            return loadContext(src.loadRef().beginParse());
        }
    }
}

export type SendParameters = {
    $$type: 'SendParameters';
    mode: bigint;
    body: Cell | null;
    code: Cell | null;
    data: Cell | null;
    value: bigint;
    to: Address;
    bounce: boolean;
}

export function storeSendParameters(src: SendParameters) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeInt(src.mode, 257);
        if (src.body !== null && src.body !== undefined) { b_0.storeBit(true).storeRef(src.body); } else { b_0.storeBit(false); }
        if (src.code !== null && src.code !== undefined) { b_0.storeBit(true).storeRef(src.code); } else { b_0.storeBit(false); }
        if (src.data !== null && src.data !== undefined) { b_0.storeBit(true).storeRef(src.data); } else { b_0.storeBit(false); }
        b_0.storeInt(src.value, 257);
        b_0.storeAddress(src.to);
        b_0.storeBit(src.bounce);
    };
}

export function loadSendParameters(slice: Slice) {
    const sc_0 = slice;
    const _mode = sc_0.loadIntBig(257);
    const _body = sc_0.loadBit() ? sc_0.loadRef() : null;
    const _code = sc_0.loadBit() ? sc_0.loadRef() : null;
    const _data = sc_0.loadBit() ? sc_0.loadRef() : null;
    const _value = sc_0.loadIntBig(257);
    const _to = sc_0.loadAddress();
    const _bounce = sc_0.loadBit();
    return { $$type: 'SendParameters' as const, mode: _mode, body: _body, code: _code, data: _data, value: _value, to: _to, bounce: _bounce };
}

export function loadTupleSendParameters(source: TupleReader) {
    const _mode = source.readBigNumber();
    const _body = source.readCellOpt();
    const _code = source.readCellOpt();
    const _data = source.readCellOpt();
    const _value = source.readBigNumber();
    const _to = source.readAddress();
    const _bounce = source.readBoolean();
    return { $$type: 'SendParameters' as const, mode: _mode, body: _body, code: _code, data: _data, value: _value, to: _to, bounce: _bounce };
}

export function loadGetterTupleSendParameters(source: TupleReader) {
    const _mode = source.readBigNumber();
    const _body = source.readCellOpt();
    const _code = source.readCellOpt();
    const _data = source.readCellOpt();
    const _value = source.readBigNumber();
    const _to = source.readAddress();
    const _bounce = source.readBoolean();
    return { $$type: 'SendParameters' as const, mode: _mode, body: _body, code: _code, data: _data, value: _value, to: _to, bounce: _bounce };
}

export function storeTupleSendParameters(source: SendParameters) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.mode);
    builder.writeCell(source.body);
    builder.writeCell(source.code);
    builder.writeCell(source.data);
    builder.writeNumber(source.value);
    builder.writeAddress(source.to);
    builder.writeBoolean(source.bounce);
    return builder.build();
}

export function dictValueParserSendParameters(): DictionaryValue<SendParameters> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeSendParameters(src)).endCell());
        },
        parse: (src) => {
            return loadSendParameters(src.loadRef().beginParse());
        }
    }
}

export type MessageParameters = {
    $$type: 'MessageParameters';
    mode: bigint;
    body: Cell | null;
    value: bigint;
    to: Address;
    bounce: boolean;
}

export function storeMessageParameters(src: MessageParameters) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeInt(src.mode, 257);
        if (src.body !== null && src.body !== undefined) { b_0.storeBit(true).storeRef(src.body); } else { b_0.storeBit(false); }
        b_0.storeInt(src.value, 257);
        b_0.storeAddress(src.to);
        b_0.storeBit(src.bounce);
    };
}

export function loadMessageParameters(slice: Slice) {
    const sc_0 = slice;
    const _mode = sc_0.loadIntBig(257);
    const _body = sc_0.loadBit() ? sc_0.loadRef() : null;
    const _value = sc_0.loadIntBig(257);
    const _to = sc_0.loadAddress();
    const _bounce = sc_0.loadBit();
    return { $$type: 'MessageParameters' as const, mode: _mode, body: _body, value: _value, to: _to, bounce: _bounce };
}

export function loadTupleMessageParameters(source: TupleReader) {
    const _mode = source.readBigNumber();
    const _body = source.readCellOpt();
    const _value = source.readBigNumber();
    const _to = source.readAddress();
    const _bounce = source.readBoolean();
    return { $$type: 'MessageParameters' as const, mode: _mode, body: _body, value: _value, to: _to, bounce: _bounce };
}

export function loadGetterTupleMessageParameters(source: TupleReader) {
    const _mode = source.readBigNumber();
    const _body = source.readCellOpt();
    const _value = source.readBigNumber();
    const _to = source.readAddress();
    const _bounce = source.readBoolean();
    return { $$type: 'MessageParameters' as const, mode: _mode, body: _body, value: _value, to: _to, bounce: _bounce };
}

export function storeTupleMessageParameters(source: MessageParameters) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.mode);
    builder.writeCell(source.body);
    builder.writeNumber(source.value);
    builder.writeAddress(source.to);
    builder.writeBoolean(source.bounce);
    return builder.build();
}

export function dictValueParserMessageParameters(): DictionaryValue<MessageParameters> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeMessageParameters(src)).endCell());
        },
        parse: (src) => {
            return loadMessageParameters(src.loadRef().beginParse());
        }
    }
}

export type DeployParameters = {
    $$type: 'DeployParameters';
    mode: bigint;
    body: Cell | null;
    value: bigint;
    bounce: boolean;
    init: StateInit;
}

export function storeDeployParameters(src: DeployParameters) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeInt(src.mode, 257);
        if (src.body !== null && src.body !== undefined) { b_0.storeBit(true).storeRef(src.body); } else { b_0.storeBit(false); }
        b_0.storeInt(src.value, 257);
        b_0.storeBit(src.bounce);
        b_0.store(storeStateInit(src.init));
    };
}

export function loadDeployParameters(slice: Slice) {
    const sc_0 = slice;
    const _mode = sc_0.loadIntBig(257);
    const _body = sc_0.loadBit() ? sc_0.loadRef() : null;
    const _value = sc_0.loadIntBig(257);
    const _bounce = sc_0.loadBit();
    const _init = loadStateInit(sc_0);
    return { $$type: 'DeployParameters' as const, mode: _mode, body: _body, value: _value, bounce: _bounce, init: _init };
}

export function loadTupleDeployParameters(source: TupleReader) {
    const _mode = source.readBigNumber();
    const _body = source.readCellOpt();
    const _value = source.readBigNumber();
    const _bounce = source.readBoolean();
    const _init = loadTupleStateInit(source);
    return { $$type: 'DeployParameters' as const, mode: _mode, body: _body, value: _value, bounce: _bounce, init: _init };
}

export function loadGetterTupleDeployParameters(source: TupleReader) {
    const _mode = source.readBigNumber();
    const _body = source.readCellOpt();
    const _value = source.readBigNumber();
    const _bounce = source.readBoolean();
    const _init = loadGetterTupleStateInit(source);
    return { $$type: 'DeployParameters' as const, mode: _mode, body: _body, value: _value, bounce: _bounce, init: _init };
}

export function storeTupleDeployParameters(source: DeployParameters) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.mode);
    builder.writeCell(source.body);
    builder.writeNumber(source.value);
    builder.writeBoolean(source.bounce);
    builder.writeTuple(storeTupleStateInit(source.init));
    return builder.build();
}

export function dictValueParserDeployParameters(): DictionaryValue<DeployParameters> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeDeployParameters(src)).endCell());
        },
        parse: (src) => {
            return loadDeployParameters(src.loadRef().beginParse());
        }
    }
}

export type StdAddress = {
    $$type: 'StdAddress';
    workchain: bigint;
    address: bigint;
}

export function storeStdAddress(src: StdAddress) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeInt(src.workchain, 8);
        b_0.storeUint(src.address, 256);
    };
}

export function loadStdAddress(slice: Slice) {
    const sc_0 = slice;
    const _workchain = sc_0.loadIntBig(8);
    const _address = sc_0.loadUintBig(256);
    return { $$type: 'StdAddress' as const, workchain: _workchain, address: _address };
}

export function loadTupleStdAddress(source: TupleReader) {
    const _workchain = source.readBigNumber();
    const _address = source.readBigNumber();
    return { $$type: 'StdAddress' as const, workchain: _workchain, address: _address };
}

export function loadGetterTupleStdAddress(source: TupleReader) {
    const _workchain = source.readBigNumber();
    const _address = source.readBigNumber();
    return { $$type: 'StdAddress' as const, workchain: _workchain, address: _address };
}

export function storeTupleStdAddress(source: StdAddress) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.workchain);
    builder.writeNumber(source.address);
    return builder.build();
}

export function dictValueParserStdAddress(): DictionaryValue<StdAddress> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeStdAddress(src)).endCell());
        },
        parse: (src) => {
            return loadStdAddress(src.loadRef().beginParse());
        }
    }
}

export type VarAddress = {
    $$type: 'VarAddress';
    workchain: bigint;
    address: Slice;
}

export function storeVarAddress(src: VarAddress) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeInt(src.workchain, 32);
        b_0.storeRef(src.address.asCell());
    };
}

export function loadVarAddress(slice: Slice) {
    const sc_0 = slice;
    const _workchain = sc_0.loadIntBig(32);
    const _address = sc_0.loadRef().asSlice();
    return { $$type: 'VarAddress' as const, workchain: _workchain, address: _address };
}

export function loadTupleVarAddress(source: TupleReader) {
    const _workchain = source.readBigNumber();
    const _address = source.readCell().asSlice();
    return { $$type: 'VarAddress' as const, workchain: _workchain, address: _address };
}

export function loadGetterTupleVarAddress(source: TupleReader) {
    const _workchain = source.readBigNumber();
    const _address = source.readCell().asSlice();
    return { $$type: 'VarAddress' as const, workchain: _workchain, address: _address };
}

export function storeTupleVarAddress(source: VarAddress) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.workchain);
    builder.writeSlice(source.address.asCell());
    return builder.build();
}

export function dictValueParserVarAddress(): DictionaryValue<VarAddress> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeVarAddress(src)).endCell());
        },
        parse: (src) => {
            return loadVarAddress(src.loadRef().beginParse());
        }
    }
}

export type BasechainAddress = {
    $$type: 'BasechainAddress';
    hash: bigint | null;
}

export function storeBasechainAddress(src: BasechainAddress) {
    return (builder: Builder) => {
        const b_0 = builder;
        if (src.hash !== null && src.hash !== undefined) { b_0.storeBit(true).storeInt(src.hash, 257); } else { b_0.storeBit(false); }
    };
}

export function loadBasechainAddress(slice: Slice) {
    const sc_0 = slice;
    const _hash = sc_0.loadBit() ? sc_0.loadIntBig(257) : null;
    return { $$type: 'BasechainAddress' as const, hash: _hash };
}

export function loadTupleBasechainAddress(source: TupleReader) {
    const _hash = source.readBigNumberOpt();
    return { $$type: 'BasechainAddress' as const, hash: _hash };
}

export function loadGetterTupleBasechainAddress(source: TupleReader) {
    const _hash = source.readBigNumberOpt();
    return { $$type: 'BasechainAddress' as const, hash: _hash };
}

export function storeTupleBasechainAddress(source: BasechainAddress) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.hash);
    return builder.build();
}

export function dictValueParserBasechainAddress(): DictionaryValue<BasechainAddress> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeBasechainAddress(src)).endCell());
        },
        parse: (src) => {
            return loadBasechainAddress(src.loadRef().beginParse());
        }
    }
}

export type Deploy = {
    $$type: 'Deploy';
    queryId: bigint;
}

export function storeDeploy(src: Deploy) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(2490013878, 32);
        b_0.storeUint(src.queryId, 64);
    };
}

export function loadDeploy(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 2490013878) { throw Error('Invalid prefix'); }
    const _queryId = sc_0.loadUintBig(64);
    return { $$type: 'Deploy' as const, queryId: _queryId };
}

export function loadTupleDeploy(source: TupleReader) {
    const _queryId = source.readBigNumber();
    return { $$type: 'Deploy' as const, queryId: _queryId };
}

export function loadGetterTupleDeploy(source: TupleReader) {
    const _queryId = source.readBigNumber();
    return { $$type: 'Deploy' as const, queryId: _queryId };
}

export function storeTupleDeploy(source: Deploy) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.queryId);
    return builder.build();
}

export function dictValueParserDeploy(): DictionaryValue<Deploy> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeDeploy(src)).endCell());
        },
        parse: (src) => {
            return loadDeploy(src.loadRef().beginParse());
        }
    }
}

export type DeployOk = {
    $$type: 'DeployOk';
    queryId: bigint;
}

export function storeDeployOk(src: DeployOk) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(2952335191, 32);
        b_0.storeUint(src.queryId, 64);
    };
}

export function loadDeployOk(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 2952335191) { throw Error('Invalid prefix'); }
    const _queryId = sc_0.loadUintBig(64);
    return { $$type: 'DeployOk' as const, queryId: _queryId };
}

export function loadTupleDeployOk(source: TupleReader) {
    const _queryId = source.readBigNumber();
    return { $$type: 'DeployOk' as const, queryId: _queryId };
}

export function loadGetterTupleDeployOk(source: TupleReader) {
    const _queryId = source.readBigNumber();
    return { $$type: 'DeployOk' as const, queryId: _queryId };
}

export function storeTupleDeployOk(source: DeployOk) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.queryId);
    return builder.build();
}

export function dictValueParserDeployOk(): DictionaryValue<DeployOk> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeDeployOk(src)).endCell());
        },
        parse: (src) => {
            return loadDeployOk(src.loadRef().beginParse());
        }
    }
}

export type FactoryDeploy = {
    $$type: 'FactoryDeploy';
    queryId: bigint;
    cashback: Address;
}

export function storeFactoryDeploy(src: FactoryDeploy) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(1829761339, 32);
        b_0.storeUint(src.queryId, 64);
        b_0.storeAddress(src.cashback);
    };
}

export function loadFactoryDeploy(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 1829761339) { throw Error('Invalid prefix'); }
    const _queryId = sc_0.loadUintBig(64);
    const _cashback = sc_0.loadAddress();
    return { $$type: 'FactoryDeploy' as const, queryId: _queryId, cashback: _cashback };
}

export function loadTupleFactoryDeploy(source: TupleReader) {
    const _queryId = source.readBigNumber();
    const _cashback = source.readAddress();
    return { $$type: 'FactoryDeploy' as const, queryId: _queryId, cashback: _cashback };
}

export function loadGetterTupleFactoryDeploy(source: TupleReader) {
    const _queryId = source.readBigNumber();
    const _cashback = source.readAddress();
    return { $$type: 'FactoryDeploy' as const, queryId: _queryId, cashback: _cashback };
}

export function storeTupleFactoryDeploy(source: FactoryDeploy) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.queryId);
    builder.writeAddress(source.cashback);
    return builder.build();
}

export function dictValueParserFactoryDeploy(): DictionaryValue<FactoryDeploy> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeFactoryDeploy(src)).endCell());
        },
        parse: (src) => {
            return loadFactoryDeploy(src.loadRef().beginParse());
        }
    }
}

export type CollectionData = {
    $$type: 'CollectionData';
    nextItemIndex: bigint;
    collectionContent: Cell;
    ownerAddress: Address;
}

export function storeCollectionData(src: CollectionData) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(src.nextItemIndex, 64);
        b_0.storeRef(src.collectionContent);
        b_0.storeAddress(src.ownerAddress);
    };
}

export function loadCollectionData(slice: Slice) {
    const sc_0 = slice;
    const _nextItemIndex = sc_0.loadUintBig(64);
    const _collectionContent = sc_0.loadRef();
    const _ownerAddress = sc_0.loadAddress();
    return { $$type: 'CollectionData' as const, nextItemIndex: _nextItemIndex, collectionContent: _collectionContent, ownerAddress: _ownerAddress };
}

export function loadTupleCollectionData(source: TupleReader) {
    const _nextItemIndex = source.readBigNumber();
    const _collectionContent = source.readCell();
    const _ownerAddress = source.readAddress();
    return { $$type: 'CollectionData' as const, nextItemIndex: _nextItemIndex, collectionContent: _collectionContent, ownerAddress: _ownerAddress };
}

export function loadGetterTupleCollectionData(source: TupleReader) {
    const _nextItemIndex = source.readBigNumber();
    const _collectionContent = source.readCell();
    const _ownerAddress = source.readAddress();
    return { $$type: 'CollectionData' as const, nextItemIndex: _nextItemIndex, collectionContent: _collectionContent, ownerAddress: _ownerAddress };
}

export function storeTupleCollectionData(source: CollectionData) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.nextItemIndex);
    builder.writeCell(source.collectionContent);
    builder.writeAddress(source.ownerAddress);
    return builder.build();
}

export function dictValueParserCollectionData(): DictionaryValue<CollectionData> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeCollectionData(src)).endCell());
        },
        parse: (src) => {
            return loadCollectionData(src.loadRef().beginParse());
        }
    }
}

export type NftData = {
    $$type: 'NftData';
    isActive: boolean;
    index: bigint;
    collectionAddress: Address;
    ownerAddress: Address;
    individualContent: Cell;
}

export function storeNftData(src: NftData) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeBit(src.isActive);
        b_0.storeUint(src.index, 64);
        b_0.storeAddress(src.collectionAddress);
        b_0.storeAddress(src.ownerAddress);
        b_0.storeRef(src.individualContent);
    };
}

export function loadNftData(slice: Slice) {
    const sc_0 = slice;
    const _isActive = sc_0.loadBit();
    const _index = sc_0.loadUintBig(64);
    const _collectionAddress = sc_0.loadAddress();
    const _ownerAddress = sc_0.loadAddress();
    const _individualContent = sc_0.loadRef();
    return { $$type: 'NftData' as const, isActive: _isActive, index: _index, collectionAddress: _collectionAddress, ownerAddress: _ownerAddress, individualContent: _individualContent };
}

export function loadTupleNftData(source: TupleReader) {
    const _isActive = source.readBoolean();
    const _index = source.readBigNumber();
    const _collectionAddress = source.readAddress();
    const _ownerAddress = source.readAddress();
    const _individualContent = source.readCell();
    return { $$type: 'NftData' as const, isActive: _isActive, index: _index, collectionAddress: _collectionAddress, ownerAddress: _ownerAddress, individualContent: _individualContent };
}

export function loadGetterTupleNftData(source: TupleReader) {
    const _isActive = source.readBoolean();
    const _index = source.readBigNumber();
    const _collectionAddress = source.readAddress();
    const _ownerAddress = source.readAddress();
    const _individualContent = source.readCell();
    return { $$type: 'NftData' as const, isActive: _isActive, index: _index, collectionAddress: _collectionAddress, ownerAddress: _ownerAddress, individualContent: _individualContent };
}

export function storeTupleNftData(source: NftData) {
    const builder = new TupleBuilder();
    builder.writeBoolean(source.isActive);
    builder.writeNumber(source.index);
    builder.writeAddress(source.collectionAddress);
    builder.writeAddress(source.ownerAddress);
    builder.writeCell(source.individualContent);
    return builder.build();
}

export function dictValueParserNftData(): DictionaryValue<NftData> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeNftData(src)).endCell());
        },
        parse: (src) => {
            return loadNftData(src.loadRef().beginParse());
        }
    }
}

export type MasteryRecord = {
    $$type: 'MasteryRecord';
    examCode: string;
    scaledScore: bigint;
    ledgerHash: bigint;
}

export function storeMasteryRecord(src: MasteryRecord) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeStringRefTail(src.examCode);
        b_0.storeUint(src.scaledScore, 16);
        b_0.storeUint(src.ledgerHash, 256);
    };
}

export function loadMasteryRecord(slice: Slice) {
    const sc_0 = slice;
    const _examCode = sc_0.loadStringRefTail();
    const _scaledScore = sc_0.loadUintBig(16);
    const _ledgerHash = sc_0.loadUintBig(256);
    return { $$type: 'MasteryRecord' as const, examCode: _examCode, scaledScore: _scaledScore, ledgerHash: _ledgerHash };
}

export function loadTupleMasteryRecord(source: TupleReader) {
    const _examCode = source.readString();
    const _scaledScore = source.readBigNumber();
    const _ledgerHash = source.readBigNumber();
    return { $$type: 'MasteryRecord' as const, examCode: _examCode, scaledScore: _scaledScore, ledgerHash: _ledgerHash };
}

export function loadGetterTupleMasteryRecord(source: TupleReader) {
    const _examCode = source.readString();
    const _scaledScore = source.readBigNumber();
    const _ledgerHash = source.readBigNumber();
    return { $$type: 'MasteryRecord' as const, examCode: _examCode, scaledScore: _scaledScore, ledgerHash: _ledgerHash };
}

export function storeTupleMasteryRecord(source: MasteryRecord) {
    const builder = new TupleBuilder();
    builder.writeString(source.examCode);
    builder.writeNumber(source.scaledScore);
    builder.writeNumber(source.ledgerHash);
    return builder.build();
}

export function dictValueParserMasteryRecord(): DictionaryValue<MasteryRecord> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeMasteryRecord(src)).endCell());
        },
        parse: (src) => {
            return loadMasteryRecord(src.loadRef().beginParse());
        }
    }
}

export type MintMasterySBT = {
    $$type: 'MintMasterySBT';
    queryId: bigint;
    recipient: Address;
    examCode: string;
    scaledScore: bigint;
    ledgerHash: bigint;
    metadataUri: string;
}

export function storeMintMasterySBT(src: MintMasterySBT) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(2281128699, 32);
        b_0.storeUint(src.queryId, 64);
        b_0.storeAddress(src.recipient);
        b_0.storeStringRefTail(src.examCode);
        b_0.storeUint(src.scaledScore, 16);
        b_0.storeUint(src.ledgerHash, 256);
        b_0.storeStringRefTail(src.metadataUri);
    };
}

export function loadMintMasterySBT(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 2281128699) { throw Error('Invalid prefix'); }
    const _queryId = sc_0.loadUintBig(64);
    const _recipient = sc_0.loadAddress();
    const _examCode = sc_0.loadStringRefTail();
    const _scaledScore = sc_0.loadUintBig(16);
    const _ledgerHash = sc_0.loadUintBig(256);
    const _metadataUri = sc_0.loadStringRefTail();
    return { $$type: 'MintMasterySBT' as const, queryId: _queryId, recipient: _recipient, examCode: _examCode, scaledScore: _scaledScore, ledgerHash: _ledgerHash, metadataUri: _metadataUri };
}

export function loadTupleMintMasterySBT(source: TupleReader) {
    const _queryId = source.readBigNumber();
    const _recipient = source.readAddress();
    const _examCode = source.readString();
    const _scaledScore = source.readBigNumber();
    const _ledgerHash = source.readBigNumber();
    const _metadataUri = source.readString();
    return { $$type: 'MintMasterySBT' as const, queryId: _queryId, recipient: _recipient, examCode: _examCode, scaledScore: _scaledScore, ledgerHash: _ledgerHash, metadataUri: _metadataUri };
}

export function loadGetterTupleMintMasterySBT(source: TupleReader) {
    const _queryId = source.readBigNumber();
    const _recipient = source.readAddress();
    const _examCode = source.readString();
    const _scaledScore = source.readBigNumber();
    const _ledgerHash = source.readBigNumber();
    const _metadataUri = source.readString();
    return { $$type: 'MintMasterySBT' as const, queryId: _queryId, recipient: _recipient, examCode: _examCode, scaledScore: _scaledScore, ledgerHash: _ledgerHash, metadataUri: _metadataUri };
}

export function storeTupleMintMasterySBT(source: MintMasterySBT) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.queryId);
    builder.writeAddress(source.recipient);
    builder.writeString(source.examCode);
    builder.writeNumber(source.scaledScore);
    builder.writeNumber(source.ledgerHash);
    builder.writeString(source.metadataUri);
    return builder.build();
}

export function dictValueParserMintMasterySBT(): DictionaryValue<MintMasterySBT> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeMintMasterySBT(src)).endCell());
        },
        parse: (src) => {
            return loadMintMasterySBT(src.loadRef().beginParse());
        }
    }
}

export type ProveOwnership = {
    $$type: 'ProveOwnership';
    queryId: bigint;
    dest: Address;
    forwardPayload: Cell;
    withContent: boolean;
}

export function storeProveOwnership(src: ProveOwnership) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(29952357, 32);
        b_0.storeUint(src.queryId, 64);
        b_0.storeAddress(src.dest);
        b_0.storeRef(src.forwardPayload);
        b_0.storeBit(src.withContent);
    };
}

export function loadProveOwnership(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 29952357) { throw Error('Invalid prefix'); }
    const _queryId = sc_0.loadUintBig(64);
    const _dest = sc_0.loadAddress();
    const _forwardPayload = sc_0.loadRef();
    const _withContent = sc_0.loadBit();
    return { $$type: 'ProveOwnership' as const, queryId: _queryId, dest: _dest, forwardPayload: _forwardPayload, withContent: _withContent };
}

export function loadTupleProveOwnership(source: TupleReader) {
    const _queryId = source.readBigNumber();
    const _dest = source.readAddress();
    const _forwardPayload = source.readCell();
    const _withContent = source.readBoolean();
    return { $$type: 'ProveOwnership' as const, queryId: _queryId, dest: _dest, forwardPayload: _forwardPayload, withContent: _withContent };
}

export function loadGetterTupleProveOwnership(source: TupleReader) {
    const _queryId = source.readBigNumber();
    const _dest = source.readAddress();
    const _forwardPayload = source.readCell();
    const _withContent = source.readBoolean();
    return { $$type: 'ProveOwnership' as const, queryId: _queryId, dest: _dest, forwardPayload: _forwardPayload, withContent: _withContent };
}

export function storeTupleProveOwnership(source: ProveOwnership) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.queryId);
    builder.writeAddress(source.dest);
    builder.writeCell(source.forwardPayload);
    builder.writeBoolean(source.withContent);
    return builder.build();
}

export function dictValueParserProveOwnership(): DictionaryValue<ProveOwnership> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeProveOwnership(src)).endCell());
        },
        parse: (src) => {
            return loadProveOwnership(src.loadRef().beginParse());
        }
    }
}

export type OwnershipProof = {
    $$type: 'OwnershipProof';
    queryId: bigint;
    itemId: bigint;
    owner: Address;
    data: Cell;
    revokedAt: bigint;
    content: Cell | null;
}

export function storeOwnershipProof(src: OwnershipProof) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(1168483547, 32);
        b_0.storeUint(src.queryId, 64);
        b_0.storeUint(src.itemId, 64);
        b_0.storeAddress(src.owner);
        b_0.storeRef(src.data);
        b_0.storeUint(src.revokedAt, 64);
        if (src.content !== null && src.content !== undefined) { b_0.storeBit(true).storeRef(src.content); } else { b_0.storeBit(false); }
    };
}

export function loadOwnershipProof(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 1168483547) { throw Error('Invalid prefix'); }
    const _queryId = sc_0.loadUintBig(64);
    const _itemId = sc_0.loadUintBig(64);
    const _owner = sc_0.loadAddress();
    const _data = sc_0.loadRef();
    const _revokedAt = sc_0.loadUintBig(64);
    const _content = sc_0.loadBit() ? sc_0.loadRef() : null;
    return { $$type: 'OwnershipProof' as const, queryId: _queryId, itemId: _itemId, owner: _owner, data: _data, revokedAt: _revokedAt, content: _content };
}

export function loadTupleOwnershipProof(source: TupleReader) {
    const _queryId = source.readBigNumber();
    const _itemId = source.readBigNumber();
    const _owner = source.readAddress();
    const _data = source.readCell();
    const _revokedAt = source.readBigNumber();
    const _content = source.readCellOpt();
    return { $$type: 'OwnershipProof' as const, queryId: _queryId, itemId: _itemId, owner: _owner, data: _data, revokedAt: _revokedAt, content: _content };
}

export function loadGetterTupleOwnershipProof(source: TupleReader) {
    const _queryId = source.readBigNumber();
    const _itemId = source.readBigNumber();
    const _owner = source.readAddress();
    const _data = source.readCell();
    const _revokedAt = source.readBigNumber();
    const _content = source.readCellOpt();
    return { $$type: 'OwnershipProof' as const, queryId: _queryId, itemId: _itemId, owner: _owner, data: _data, revokedAt: _revokedAt, content: _content };
}

export function storeTupleOwnershipProof(source: OwnershipProof) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.queryId);
    builder.writeNumber(source.itemId);
    builder.writeAddress(source.owner);
    builder.writeCell(source.data);
    builder.writeNumber(source.revokedAt);
    builder.writeCell(source.content);
    return builder.build();
}

export function dictValueParserOwnershipProof(): DictionaryValue<OwnershipProof> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeOwnershipProof(src)).endCell());
        },
        parse: (src) => {
            return loadOwnershipProof(src.loadRef().beginParse());
        }
    }
}

export type RevokeSBT = {
    $$type: 'RevokeSBT';
    queryId: bigint;
}

export function storeRevokeSBT(src: RevokeSBT) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(3651017930, 32);
        b_0.storeUint(src.queryId, 64);
    };
}

export function loadRevokeSBT(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 3651017930) { throw Error('Invalid prefix'); }
    const _queryId = sc_0.loadUintBig(64);
    return { $$type: 'RevokeSBT' as const, queryId: _queryId };
}

export function loadTupleRevokeSBT(source: TupleReader) {
    const _queryId = source.readBigNumber();
    return { $$type: 'RevokeSBT' as const, queryId: _queryId };
}

export function loadGetterTupleRevokeSBT(source: TupleReader) {
    const _queryId = source.readBigNumber();
    return { $$type: 'RevokeSBT' as const, queryId: _queryId };
}

export function storeTupleRevokeSBT(source: RevokeSBT) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.queryId);
    return builder.build();
}

export function dictValueParserRevokeSBT(): DictionaryValue<RevokeSBT> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeRevokeSBT(src)).endCell());
        },
        parse: (src) => {
            return loadRevokeSBT(src.loadRef().beginParse());
        }
    }
}

export type ClarioraMasterySBTCollection$Data = {
    $$type: 'ClarioraMasterySBTCollection$Data';
    owner: Address;
    oracle: Address;
    nextItemIndex: bigint;
    collectionContent: Cell;
}

export function storeClarioraMasterySBTCollection$Data(src: ClarioraMasterySBTCollection$Data) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeAddress(src.owner);
        b_0.storeAddress(src.oracle);
        b_0.storeUint(src.nextItemIndex, 64);
        b_0.storeRef(src.collectionContent);
    };
}

export function loadClarioraMasterySBTCollection$Data(slice: Slice) {
    const sc_0 = slice;
    const _owner = sc_0.loadAddress();
    const _oracle = sc_0.loadAddress();
    const _nextItemIndex = sc_0.loadUintBig(64);
    const _collectionContent = sc_0.loadRef();
    return { $$type: 'ClarioraMasterySBTCollection$Data' as const, owner: _owner, oracle: _oracle, nextItemIndex: _nextItemIndex, collectionContent: _collectionContent };
}

export function loadTupleClarioraMasterySBTCollection$Data(source: TupleReader) {
    const _owner = source.readAddress();
    const _oracle = source.readAddress();
    const _nextItemIndex = source.readBigNumber();
    const _collectionContent = source.readCell();
    return { $$type: 'ClarioraMasterySBTCollection$Data' as const, owner: _owner, oracle: _oracle, nextItemIndex: _nextItemIndex, collectionContent: _collectionContent };
}

export function loadGetterTupleClarioraMasterySBTCollection$Data(source: TupleReader) {
    const _owner = source.readAddress();
    const _oracle = source.readAddress();
    const _nextItemIndex = source.readBigNumber();
    const _collectionContent = source.readCell();
    return { $$type: 'ClarioraMasterySBTCollection$Data' as const, owner: _owner, oracle: _oracle, nextItemIndex: _nextItemIndex, collectionContent: _collectionContent };
}

export function storeTupleClarioraMasterySBTCollection$Data(source: ClarioraMasterySBTCollection$Data) {
    const builder = new TupleBuilder();
    builder.writeAddress(source.owner);
    builder.writeAddress(source.oracle);
    builder.writeNumber(source.nextItemIndex);
    builder.writeCell(source.collectionContent);
    return builder.build();
}

export function dictValueParserClarioraMasterySBTCollection$Data(): DictionaryValue<ClarioraMasterySBTCollection$Data> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeClarioraMasterySBTCollection$Data(src)).endCell());
        },
        parse: (src) => {
            return loadClarioraMasterySBTCollection$Data(src.loadRef().beginParse());
        }
    }
}

export type ClarioraMasterySBTItem$Data = {
    $$type: 'ClarioraMasterySBTItem$Data';
    collection: Address;
    index: bigint;
    owner: Address;
    authority: Address;
    examCode: string;
    scaledScore: bigint;
    ledgerHash: bigint;
    revokedAt: bigint;
}

export function storeClarioraMasterySBTItem$Data(src: ClarioraMasterySBTItem$Data) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeAddress(src.collection);
        b_0.storeUint(src.index, 64);
        b_0.storeAddress(src.owner);
        b_0.storeAddress(src.authority);
        b_0.storeStringRefTail(src.examCode);
        b_0.storeUint(src.scaledScore, 16);
        const b_1 = new Builder();
        b_1.storeUint(src.ledgerHash, 256);
        b_1.storeUint(src.revokedAt, 64);
        b_0.storeRef(b_1.endCell());
    };
}

export function loadClarioraMasterySBTItem$Data(slice: Slice) {
    const sc_0 = slice;
    const _collection = sc_0.loadAddress();
    const _index = sc_0.loadUintBig(64);
    const _owner = sc_0.loadAddress();
    const _authority = sc_0.loadAddress();
    const _examCode = sc_0.loadStringRefTail();
    const _scaledScore = sc_0.loadUintBig(16);
    const sc_1 = sc_0.loadRef().beginParse();
    const _ledgerHash = sc_1.loadUintBig(256);
    const _revokedAt = sc_1.loadUintBig(64);
    return { $$type: 'ClarioraMasterySBTItem$Data' as const, collection: _collection, index: _index, owner: _owner, authority: _authority, examCode: _examCode, scaledScore: _scaledScore, ledgerHash: _ledgerHash, revokedAt: _revokedAt };
}

export function loadTupleClarioraMasterySBTItem$Data(source: TupleReader) {
    const _collection = source.readAddress();
    const _index = source.readBigNumber();
    const _owner = source.readAddress();
    const _authority = source.readAddress();
    const _examCode = source.readString();
    const _scaledScore = source.readBigNumber();
    const _ledgerHash = source.readBigNumber();
    const _revokedAt = source.readBigNumber();
    return { $$type: 'ClarioraMasterySBTItem$Data' as const, collection: _collection, index: _index, owner: _owner, authority: _authority, examCode: _examCode, scaledScore: _scaledScore, ledgerHash: _ledgerHash, revokedAt: _revokedAt };
}

export function loadGetterTupleClarioraMasterySBTItem$Data(source: TupleReader) {
    const _collection = source.readAddress();
    const _index = source.readBigNumber();
    const _owner = source.readAddress();
    const _authority = source.readAddress();
    const _examCode = source.readString();
    const _scaledScore = source.readBigNumber();
    const _ledgerHash = source.readBigNumber();
    const _revokedAt = source.readBigNumber();
    return { $$type: 'ClarioraMasterySBTItem$Data' as const, collection: _collection, index: _index, owner: _owner, authority: _authority, examCode: _examCode, scaledScore: _scaledScore, ledgerHash: _ledgerHash, revokedAt: _revokedAt };
}

export function storeTupleClarioraMasterySBTItem$Data(source: ClarioraMasterySBTItem$Data) {
    const builder = new TupleBuilder();
    builder.writeAddress(source.collection);
    builder.writeNumber(source.index);
    builder.writeAddress(source.owner);
    builder.writeAddress(source.authority);
    builder.writeString(source.examCode);
    builder.writeNumber(source.scaledScore);
    builder.writeNumber(source.ledgerHash);
    builder.writeNumber(source.revokedAt);
    return builder.build();
}

export function dictValueParserClarioraMasterySBTItem$Data(): DictionaryValue<ClarioraMasterySBTItem$Data> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeClarioraMasterySBTItem$Data(src)).endCell());
        },
        parse: (src) => {
            return loadClarioraMasterySBTItem$Data(src.loadRef().beginParse());
        }
    }
}

 type ClarioraMasterySBTCollection_init_args = {
    $$type: 'ClarioraMasterySBTCollection_init_args';
    owner: Address;
    oracle: Address;
    collectionContent: Cell;
}

function initClarioraMasterySBTCollection_init_args(src: ClarioraMasterySBTCollection_init_args) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeAddress(src.owner);
        b_0.storeAddress(src.oracle);
        b_0.storeRef(src.collectionContent);
    };
}

async function ClarioraMasterySBTCollection_init(owner: Address, oracle: Address, collectionContent: Cell) {
    const __code = Cell.fromHex('b5ee9c72410223010006a20003e4ff008e88f4a413f4bcf2c80bed53208f5d3001d072d721d200d200fa4021103450666f04f86102f862ed44d0d200019bfa40fa40d33fd455306c149cfa40fa40d4552003d1587001e205925f05e003d70d1ff2e08221821087f742fbbae302018210946a98b6bae3025f05f2c082e1ed43d90109220202710207020397300305014ba43bda89a1a4000337f481f481a67fa8aa60d82939f481f481a8aa4007a2b0e003c5b678d88304000222014fa747da89a1a4000337f481f481a67fa8aa60d82939f481f481a8aa4007a2b0e003c4aa07b678d883060178f828f8288b0870530710565520db3c705920f90022f9005ad76501d76582020134c8cb17cb0fcb0fcbffcbff71f90400c87401cb0212ca07cbffc9d00a014dbc82df6a268690000cdfd207d20699fea2a98360a4e7d207d206a2a9001e8ac3800f16d9e3621c08000654710304fe31d33f31fa40d401d001d30fd3ff30f8416f2410235f0382009bf55316c70592317f945117c705e2f2f4f82851475413465023db3c5c705920f90022f9005ad76501d76582020134c8cb17cb0fcb0fcbffcbff71f90400c87401cb0212ca07cbffc9d0820afaf08072708810461035443010464515504403c8cf8580ca00890a1f2021013a88c87001ca0055615067ce14cb3f12cece01c8cecdcb0f01c8cbffcdc90b0228ff008e88f4a413f4bcf2c80bed5320e303ed43d90c170202710d120201580e1001a9b5631da89a1a400031c49f481a67ff481f481a803a003a61fa803a1a7ffa67e602050204e204c204a20482046d8311c3ff481a67ff481f481a803a003a61fa803a1a7fe602e2c2a2886600fa2aa0ae1c5b678d90300f00022401a9b7b07da89a1a400031c49f481a67ff481f481a803a003a61fa803a1a7ffa67e602050204e204c204a20482046d8311c3ff481a67ff481f481a803a003a61fa803a1a7fe602e2c2a2886600fa2aa0ae1c5b678d903011000220020162131501a9b3f3fb513434800063893e9034cffe903e903500740074c3f5007434fff4cfcc040a0409c409840944090408db062387fe9034cffe903e903500740074c3f5007434ffcc05c5854510cc01f455415c38b6cf1b216014011220c000885468a052901a01a9b1c23b513434800063893e9034cffe903e903500740074c3f5007434fff4cfcc040a0409c409840944090408db062387fe9034cffe903e903500740074c3f5007434ffcc05c5854510cc01f455415c38b6cf1b20e016000654732102f430eda2edfb01d072d721d200d200fa4021103450666f04f86102f862ed44d0d200018e24fa40d33ffa40fa40d401d001d30fd401d0d3ffd33f301028102710261025102410236c188e1ffa40d33ffa40fa40d401d001d30fd401d0d3ff3017161514433007d1550570e209925f09e027d749c21fe30007f90120181c01be07d31f218209c90965bae302018210d99e1ccaba8e4730f8416f245b8200e7c53224c705f2f4812aee08c00018f2f4f823105710461035443012c87f01ca0055705078ce15cb3f13cece01c8cecdcb0f01c8cbff12cb3fcdc9ed54db31e0071902ee31d33ffa4030f8416f245b82008c9e3227c705f2f470804088146d2a544a3052f0c85550821045a5a4db5007cb1f15cb3f13cb3fcecccb3ff400c941305a6d6d40037fc8cf8580ca00cf8440ce01fa028069cf40025c6e016eb0935bcf819d58cf8680cf8480f400f400cf81e2f400c901fb00105755141a1b00000046c87f01ca0055705078ce15cb3f13cece01c8cecdcb0f01c8cbff12cb3fcdc9ed54db3101f282f07e2b1709e6236d745f5a973c89c690596a88dc4b5b35dd228d71a642a8291ff6ba8e2930f2c3e910575514c87f01ca0055705078ce15cb3f13cece01c8cecdcb0f01c8cbff12cb3fcdc9ed54e082f0bb82cd86b73dd91b29db6719d7f385bc87f9ca3e3c933ba0c3ddf37418ad8874bae3025f08f2c0821d01e2f8416f245b8108773225c705f2f4708100a0882655205a6d6d40037fc8cf8580ca00cf8440ce01fa028069cf40025c6e016eb0935bcf819d58cf8680cf8480f400f400cf81e2f400c901fb0010575514c87f01ca0055705078ce15cb3f13cece01c8cecdcb0f01c8cbff12cb3fcdc9ed541e001a0000000064657374726f796564001000000000696e6974000110007ccf16ce01fa028069cf40025c6e016eb0935bcf819d58cf8680cf8480f400f400cf81e2f400c901fb0002a45003c87f01ca0055305034cececb3fccc9ed540090d33f30c8018210aff90f5758cb1fcb3fc9443012f84270705003804201503304c8cf8580ca00cf8440ce01fa02806acf40f400c901fb00c87f01ca0055305034cececb3fccc9ed5471ecdeb0');
    const builder = beginCell();
    builder.storeUint(0, 1);
    initClarioraMasterySBTCollection_init_args({ $$type: 'ClarioraMasterySBTCollection_init_args', owner, oracle, collectionContent })(builder);
    const __data = builder.endCell();
    return { code: __code, data: __data };
}

export const ClarioraMasterySBTCollection_errors = {
    2: { message: "Stack underflow" },
    3: { message: "Stack overflow" },
    4: { message: "Integer overflow" },
    5: { message: "Integer out of expected range" },
    6: { message: "Invalid opcode" },
    7: { message: "Type check error" },
    8: { message: "Cell overflow" },
    9: { message: "Cell underflow" },
    10: { message: "Dictionary error" },
    11: { message: "'Unknown' error" },
    12: { message: "Fatal error" },
    13: { message: "Out of gas error" },
    14: { message: "Virtualization error" },
    32: { message: "Action list is invalid" },
    33: { message: "Action list is too long" },
    34: { message: "Action is invalid or not supported" },
    35: { message: "Invalid source address in outbound message" },
    36: { message: "Invalid destination address in outbound message" },
    37: { message: "Not enough Toncoin" },
    38: { message: "Not enough extra currencies" },
    39: { message: "Outbound message does not fit into a cell after rewriting" },
    40: { message: "Cannot process a message" },
    41: { message: "Library reference is null" },
    42: { message: "Library change action error" },
    43: { message: "Exceeded maximum number of cells in the library or the maximum depth of the Merkle tree" },
    50: { message: "Account state size exceeded limits" },
    128: { message: "Null reference exception" },
    129: { message: "Invalid serialization prefix" },
    130: { message: "Invalid incoming message" },
    131: { message: "Constraints error" },
    132: { message: "Access denied" },
    133: { message: "Contract stopped" },
    134: { message: "Invalid argument" },
    135: { message: "Code of a contract was not found" },
    136: { message: "Invalid standard address" },
    138: { message: "Not a basechain address" },
    2167: { message: "Only owner can destroy" },
    10990: { message: "Already revoked" },
    35998: { message: "Only owner can prove ownership" },
    39925: { message: "Unauthorized mint" },
    59333: { message: "Only authority can revoke" },
} as const

export const ClarioraMasterySBTCollection_errors_backward = {
    "Stack underflow": 2,
    "Stack overflow": 3,
    "Integer overflow": 4,
    "Integer out of expected range": 5,
    "Invalid opcode": 6,
    "Type check error": 7,
    "Cell overflow": 8,
    "Cell underflow": 9,
    "Dictionary error": 10,
    "'Unknown' error": 11,
    "Fatal error": 12,
    "Out of gas error": 13,
    "Virtualization error": 14,
    "Action list is invalid": 32,
    "Action list is too long": 33,
    "Action is invalid or not supported": 34,
    "Invalid source address in outbound message": 35,
    "Invalid destination address in outbound message": 36,
    "Not enough Toncoin": 37,
    "Not enough extra currencies": 38,
    "Outbound message does not fit into a cell after rewriting": 39,
    "Cannot process a message": 40,
    "Library reference is null": 41,
    "Library change action error": 42,
    "Exceeded maximum number of cells in the library or the maximum depth of the Merkle tree": 43,
    "Account state size exceeded limits": 50,
    "Null reference exception": 128,
    "Invalid serialization prefix": 129,
    "Invalid incoming message": 130,
    "Constraints error": 131,
    "Access denied": 132,
    "Contract stopped": 133,
    "Invalid argument": 134,
    "Code of a contract was not found": 135,
    "Invalid standard address": 136,
    "Not a basechain address": 138,
    "Only owner can destroy": 2167,
    "Already revoked": 10990,
    "Only owner can prove ownership": 35998,
    "Unauthorized mint": 39925,
    "Only authority can revoke": 59333,
} as const

const ClarioraMasterySBTCollection_types: ABIType[] = [
    {"name":"DataSize","header":null,"fields":[{"name":"cells","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"bits","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"refs","type":{"kind":"simple","type":"int","optional":false,"format":257}}]},
    {"name":"SignedBundle","header":null,"fields":[{"name":"signature","type":{"kind":"simple","type":"fixed-bytes","optional":false,"format":64}},{"name":"signedData","type":{"kind":"simple","type":"slice","optional":false,"format":"remainder"}}]},
    {"name":"StateInit","header":null,"fields":[{"name":"code","type":{"kind":"simple","type":"cell","optional":false}},{"name":"data","type":{"kind":"simple","type":"cell","optional":false}}]},
    {"name":"Context","header":null,"fields":[{"name":"bounceable","type":{"kind":"simple","type":"bool","optional":false}},{"name":"sender","type":{"kind":"simple","type":"address","optional":false}},{"name":"value","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"raw","type":{"kind":"simple","type":"slice","optional":false}}]},
    {"name":"SendParameters","header":null,"fields":[{"name":"mode","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"body","type":{"kind":"simple","type":"cell","optional":true}},{"name":"code","type":{"kind":"simple","type":"cell","optional":true}},{"name":"data","type":{"kind":"simple","type":"cell","optional":true}},{"name":"value","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"to","type":{"kind":"simple","type":"address","optional":false}},{"name":"bounce","type":{"kind":"simple","type":"bool","optional":false}}]},
    {"name":"MessageParameters","header":null,"fields":[{"name":"mode","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"body","type":{"kind":"simple","type":"cell","optional":true}},{"name":"value","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"to","type":{"kind":"simple","type":"address","optional":false}},{"name":"bounce","type":{"kind":"simple","type":"bool","optional":false}}]},
    {"name":"DeployParameters","header":null,"fields":[{"name":"mode","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"body","type":{"kind":"simple","type":"cell","optional":true}},{"name":"value","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"bounce","type":{"kind":"simple","type":"bool","optional":false}},{"name":"init","type":{"kind":"simple","type":"StateInit","optional":false}}]},
    {"name":"StdAddress","header":null,"fields":[{"name":"workchain","type":{"kind":"simple","type":"int","optional":false,"format":8}},{"name":"address","type":{"kind":"simple","type":"uint","optional":false,"format":256}}]},
    {"name":"VarAddress","header":null,"fields":[{"name":"workchain","type":{"kind":"simple","type":"int","optional":false,"format":32}},{"name":"address","type":{"kind":"simple","type":"slice","optional":false}}]},
    {"name":"BasechainAddress","header":null,"fields":[{"name":"hash","type":{"kind":"simple","type":"int","optional":true,"format":257}}]},
    {"name":"Deploy","header":2490013878,"fields":[{"name":"queryId","type":{"kind":"simple","type":"uint","optional":false,"format":64}}]},
    {"name":"DeployOk","header":2952335191,"fields":[{"name":"queryId","type":{"kind":"simple","type":"uint","optional":false,"format":64}}]},
    {"name":"FactoryDeploy","header":1829761339,"fields":[{"name":"queryId","type":{"kind":"simple","type":"uint","optional":false,"format":64}},{"name":"cashback","type":{"kind":"simple","type":"address","optional":false}}]},
    {"name":"CollectionData","header":null,"fields":[{"name":"nextItemIndex","type":{"kind":"simple","type":"uint","optional":false,"format":64}},{"name":"collectionContent","type":{"kind":"simple","type":"cell","optional":false}},{"name":"ownerAddress","type":{"kind":"simple","type":"address","optional":false}}]},
    {"name":"NftData","header":null,"fields":[{"name":"isActive","type":{"kind":"simple","type":"bool","optional":false}},{"name":"index","type":{"kind":"simple","type":"uint","optional":false,"format":64}},{"name":"collectionAddress","type":{"kind":"simple","type":"address","optional":false}},{"name":"ownerAddress","type":{"kind":"simple","type":"address","optional":false}},{"name":"individualContent","type":{"kind":"simple","type":"cell","optional":false}}]},
    {"name":"MasteryRecord","header":null,"fields":[{"name":"examCode","type":{"kind":"simple","type":"string","optional":false}},{"name":"scaledScore","type":{"kind":"simple","type":"uint","optional":false,"format":16}},{"name":"ledgerHash","type":{"kind":"simple","type":"uint","optional":false,"format":256}}]},
    {"name":"MintMasterySBT","header":2281128699,"fields":[{"name":"queryId","type":{"kind":"simple","type":"uint","optional":false,"format":64}},{"name":"recipient","type":{"kind":"simple","type":"address","optional":false}},{"name":"examCode","type":{"kind":"simple","type":"string","optional":false}},{"name":"scaledScore","type":{"kind":"simple","type":"uint","optional":false,"format":16}},{"name":"ledgerHash","type":{"kind":"simple","type":"uint","optional":false,"format":256}},{"name":"metadataUri","type":{"kind":"simple","type":"string","optional":false}}]},
    {"name":"ProveOwnership","header":29952357,"fields":[{"name":"queryId","type":{"kind":"simple","type":"uint","optional":false,"format":64}},{"name":"dest","type":{"kind":"simple","type":"address","optional":false}},{"name":"forwardPayload","type":{"kind":"simple","type":"cell","optional":false}},{"name":"withContent","type":{"kind":"simple","type":"bool","optional":false}}]},
    {"name":"OwnershipProof","header":1168483547,"fields":[{"name":"queryId","type":{"kind":"simple","type":"uint","optional":false,"format":64}},{"name":"itemId","type":{"kind":"simple","type":"uint","optional":false,"format":64}},{"name":"owner","type":{"kind":"simple","type":"address","optional":false}},{"name":"data","type":{"kind":"simple","type":"cell","optional":false}},{"name":"revokedAt","type":{"kind":"simple","type":"uint","optional":false,"format":64}},{"name":"content","type":{"kind":"simple","type":"cell","optional":true}}]},
    {"name":"RevokeSBT","header":3651017930,"fields":[{"name":"queryId","type":{"kind":"simple","type":"uint","optional":false,"format":64}}]},
    {"name":"ClarioraMasterySBTCollection$Data","header":null,"fields":[{"name":"owner","type":{"kind":"simple","type":"address","optional":false}},{"name":"oracle","type":{"kind":"simple","type":"address","optional":false}},{"name":"nextItemIndex","type":{"kind":"simple","type":"uint","optional":false,"format":64}},{"name":"collectionContent","type":{"kind":"simple","type":"cell","optional":false}}]},
    {"name":"ClarioraMasterySBTItem$Data","header":null,"fields":[{"name":"collection","type":{"kind":"simple","type":"address","optional":false}},{"name":"index","type":{"kind":"simple","type":"uint","optional":false,"format":64}},{"name":"owner","type":{"kind":"simple","type":"address","optional":false}},{"name":"authority","type":{"kind":"simple","type":"address","optional":false}},{"name":"examCode","type":{"kind":"simple","type":"string","optional":false}},{"name":"scaledScore","type":{"kind":"simple","type":"uint","optional":false,"format":16}},{"name":"ledgerHash","type":{"kind":"simple","type":"uint","optional":false,"format":256}},{"name":"revokedAt","type":{"kind":"simple","type":"uint","optional":false,"format":64}}]},
]

const ClarioraMasterySBTCollection_opcodes = {
    "Deploy": 2490013878,
    "DeployOk": 2952335191,
    "FactoryDeploy": 1829761339,
    "MintMasterySBT": 2281128699,
    "ProveOwnership": 29952357,
    "OwnershipProof": 1168483547,
    "RevokeSBT": 3651017930,
}

const ClarioraMasterySBTCollection_getters: ABIGetter[] = [
    {"name":"get_collection_data","methodId":102491,"arguments":[],"returnType":{"kind":"simple","type":"CollectionData","optional":false}},
    {"name":"get_nft_address_by_index","methodId":92067,"arguments":[{"name":"index","type":{"kind":"simple","type":"int","optional":false,"format":257}}],"returnType":{"kind":"simple","type":"address","optional":false}},
    {"name":"get_oracle_address","methodId":91165,"arguments":[],"returnType":{"kind":"simple","type":"address","optional":false}},
]

export const ClarioraMasterySBTCollection_getterMapping: { [key: string]: string } = {
    'get_collection_data': 'getGetCollectionData',
    'get_nft_address_by_index': 'getGetNftAddressByIndex',
    'get_oracle_address': 'getGetOracleAddress',
}

const ClarioraMasterySBTCollection_receivers: ABIReceiver[] = [
    {"receiver":"internal","message":{"kind":"typed","type":"MintMasterySBT"}},
    {"receiver":"internal","message":{"kind":"typed","type":"Deploy"}},
]


export class ClarioraMasterySBTCollection implements Contract {
    
    public static readonly storageReserve = 0n;
    public static readonly errors = ClarioraMasterySBTCollection_errors_backward;
    public static readonly opcodes = ClarioraMasterySBTCollection_opcodes;
    
    static async init(owner: Address, oracle: Address, collectionContent: Cell) {
        return await ClarioraMasterySBTCollection_init(owner, oracle, collectionContent);
    }
    
    static async fromInit(owner: Address, oracle: Address, collectionContent: Cell) {
        const __gen_init = await ClarioraMasterySBTCollection_init(owner, oracle, collectionContent);
        const address = contractAddress(0, __gen_init);
        return new ClarioraMasterySBTCollection(address, __gen_init);
    }
    
    static fromAddress(address: Address) {
        return new ClarioraMasterySBTCollection(address);
    }
    
    readonly address: Address; 
    readonly init?: { code: Cell, data: Cell };
    readonly abi: ContractABI = {
        types:  ClarioraMasterySBTCollection_types,
        getters: ClarioraMasterySBTCollection_getters,
        receivers: ClarioraMasterySBTCollection_receivers,
        errors: ClarioraMasterySBTCollection_errors,
    };
    
    constructor(address: Address, init?: { code: Cell, data: Cell }) {
        this.address = address;
        this.init = init;
    }
    
    async send(provider: ContractProvider, via: Sender, args: { value: bigint, bounce?: boolean| null | undefined }, message: MintMasterySBT | Deploy) {
        
        let body: Cell | null = null;
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'MintMasterySBT') {
            body = beginCell().store(storeMintMasterySBT(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'Deploy') {
            body = beginCell().store(storeDeploy(message)).endCell();
        }
        if (body === null) { throw new Error('Invalid message type'); }
        
        await provider.internal(via, { ...args, body: body });
        
    }
    
    async getGetCollectionData(provider: ContractProvider) {
        const builder = new TupleBuilder();
        const source = (await provider.get('get_collection_data', builder.build())).stack;
        const result = loadGetterTupleCollectionData(source);
        return result;
    }
    
    async getGetNftAddressByIndex(provider: ContractProvider, index: bigint) {
        const builder = new TupleBuilder();
        builder.writeNumber(index);
        const source = (await provider.get('get_nft_address_by_index', builder.build())).stack;
        const result = source.readAddress();
        return result;
    }
    
    async getGetOracleAddress(provider: ContractProvider) {
        const builder = new TupleBuilder();
        const source = (await provider.get('get_oracle_address', builder.build())).stack;
        const result = source.readAddress();
        return result;
    }
    
}