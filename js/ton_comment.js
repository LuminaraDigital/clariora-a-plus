/**
 * ton_comment.js
 * Encode TON wallet text comments as base64 BoC payloads for TonConnect.
 * Format: opcode 0 (32 bits) + UTF-8 bytes in a single cell (TEP-compatible comment).
 * Must match @ton/core beginCell().storeUint(0,32).storeStringTail(text).endCell().toBoc().
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.TONComment = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var POLY = 0x82f63b78;
  var MAX_COMMENT_BYTES = 123; // 127 cell bytes - 4 opcode bytes

  function utf8Bytes(text) {
    var str = String(text == null ? '' : text);
    if (typeof TextEncoder !== 'undefined') {
      return new TextEncoder().encode(str);
    }
    // Node / older runtimes
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(str, 'utf8');
    }
    var escaped = unescape(encodeURIComponent(str));
    var out = new Uint8Array(escaped.length);
    for (var i = 0; i < escaped.length; i++) out[i] = escaped.charCodeAt(i) & 0xff;
    return out;
  }

  function crc32c(source) {
    var crc = 0 ^ 0xffffffff;
    for (var n = 0; n < source.length; n++) {
      crc ^= source[n];
      crc = crc & 1 ? (crc >>> 1) ^ POLY : crc >>> 1;
      crc = crc & 1 ? (crc >>> 1) ^ POLY : crc >>> 1;
      crc = crc & 1 ? (crc >>> 1) ^ POLY : crc >>> 1;
      crc = crc & 1 ? (crc >>> 1) ^ POLY : crc >>> 1;
      crc = crc & 1 ? (crc >>> 1) ^ POLY : crc >>> 1;
      crc = crc & 1 ? (crc >>> 1) ^ POLY : crc >>> 1;
      crc = crc & 1 ? (crc >>> 1) ^ POLY : crc >>> 1;
      crc = crc & 1 ? (crc >>> 1) ^ POLY : crc >>> 1;
    }
    crc = crc ^ 0xffffffff;
    return new Uint8Array([
      crc & 0xff,
      (crc >>> 8) & 0xff,
      (crc >>> 16) & 0xff,
      (crc >>> 24) & 0xff
    ]);
  }

  function bytesToBase64(bytes) {
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(bytes).toString('base64');
    }
    var binary = '';
    for (var i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  }

  /**
   * @param {string} text Order memo / credential comment (UTF-8, <= 123 bytes)
   * @returns {string} base64 BoC suitable for TonConnect message.payload
   */
  function encodeTonTextComment(text) {
    var body = utf8Bytes(text);
    if (body.length > MAX_COMMENT_BYTES) {
      throw new Error('TON comment exceeds single-cell limit (' + MAX_COMMENT_BYTES + ' UTF-8 bytes).');
    }

    var dataLen = 4 + body.length;
    var cellData = new Uint8Array(dataLen);
    cellData.set(body, 4); // first 4 bytes remain 0 (opcode)

    var bitLen = dataLen * 8;
    var d1 = 0; // no refs
    var d2 = Math.floor(bitLen / 8) + Math.ceil(bitLen / 8); // byte-aligned

    // BOC (magic 0xb5ee9c72): flags + offBytes + cells/roots/absent + tot_size + root idx + cell + crc32c
    // flags 0x41 = has_crc32c=1, size=1 (index byte width)
    var totSize = 2 + dataLen; // d1 + d2 + data
    var bocLen = 4 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + totSize + 4;
    var boc = new Uint8Array(bocLen);
    var o = 0;
    boc[o++] = 0xb5;
    boc[o++] = 0xee;
    boc[o++] = 0x9c;
    boc[o++] = 0x72;
    boc[o++] = 0x41; // has_crc32c, size_bytes=1
    boc[o++] = 0x01; // offBytes
    boc[o++] = 0x01; // cells
    boc[o++] = 0x01; // roots
    boc[o++] = 0x00; // absent
    boc[o++] = totSize & 0xff;
    boc[o++] = 0x00; // root index 0
    boc[o++] = d1;
    boc[o++] = d2;
    boc.set(cellData, o);
    o += dataLen;

    var crc = crc32c(boc.subarray(0, o));
    boc.set(crc, o);
    return bytesToBase64(boc);
  }

  /** TonConnect network id: mainnet -239, testnet -3 */
  function tonConnectNetworkId(network) {
    return network === 'testnet' ? '-3' : '-239';
  }

  function detectTonNetwork() {
    try {
      if (typeof location === 'undefined' || !location.hostname) return 'mainnet';
      var host = String(location.hostname).toLowerCase();
      if (host.indexOf('staging') !== -1) return 'testnet';
      if (host.indexOf('localhost') !== -1 || host === '127.0.0.1') return 'testnet';
      if (/\.workers\.dev$/.test(host) && host.indexOf('clariora-a-plus-staging') !== -1) {
        return 'testnet';
      }
    } catch (e) {}
    return 'mainnet';
  }

  return {
    encodeTonTextComment: encodeTonTextComment,
    tonConnectNetworkId: tonConnectNetworkId,
    detectTonNetwork: detectTonNetwork,
    MAX_COMMENT_BYTES: MAX_COMMENT_BYTES
  };
});
