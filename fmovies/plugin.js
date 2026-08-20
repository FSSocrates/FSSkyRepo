(function () {
  "use strict";

  // ---- Pure JS crypto (no WebCrypto required) ----
  var SBOX = new Uint8Array([
    0x63,0x7c,0x77,0x7b,0xf2,0x6b,0x6f,0xc5,0x30,0x01,0x67,0x2b,0xfe,0xd7,0xab,0x76,
    0xca,0x82,0xc9,0x7d,0xfa,0x59,0x47,0xf0,0xad,0xd4,0xa2,0xaf,0x9c,0xa4,0x72,0xc0,
    0xb7,0xfd,0x93,0x26,0x36,0x3f,0xf7,0xcc,0x34,0xa5,0xe5,0xf1,0x71,0xd8,0x31,0x15,
    0x04,0xc7,0x23,0xc3,0x18,0x96,0x05,0x9a,0x07,0x12,0x80,0xe2,0xeb,0x27,0xb2,0x75,
    0x09,0x83,0x2c,0x1a,0x1b,0x6e,0x5a,0xa0,0x52,0x3b,0xd6,0xb3,0x29,0xe3,0x2f,0x84,
    0x53,0xd1,0x00,0xed,0x20,0xfc,0xb1,0x5b,0x6a,0xcb,0xbe,0x39,0x4a,0x4c,0x58,0xcf,
    0xd0,0xef,0xaa,0xfb,0x43,0x4d,0x33,0x85,0x45,0xf9,0x02,0x7f,0x50,0x3c,0x9f,0xa8,
    0x51,0xa3,0x40,0x8f,0x92,0x9d,0x38,0xf5,0xbc,0xb6,0xda,0x21,0x10,0xff,0xf3,0xd2,
    0xcd,0x0c,0x13,0xec,0x5f,0x97,0x44,0x17,0xc4,0xa7,0x7e,0x3d,0x64,0x5d,0x19,0x73,
    0x60,0x81,0x4f,0xdc,0x22,0x2a,0x90,0x88,0x46,0xee,0xb8,0x14,0xde,0x5e,0x0b,0xdb,
    0xe0,0x32,0x3a,0x0a,0x49,0x06,0x24,0x5c,0xc2,0xd3,0xac,0x62,0x91,0x95,0xe4,0x79,
    0xe7,0xc8,0x37,0x6d,0x8d,0xd5,0x4e,0xa9,0x6c,0x56,0xf4,0xea,0x65,0x7a,0xae,0x08,
    0xba,0x78,0x25,0x2e,0x1c,0xa6,0xb4,0xc6,0xe8,0xdd,0x74,0x1f,0x4b,0xbd,0x8b,0x8a,
    0x70,0x3e,0xb5,0x66,0x48,0x03,0xf6,0x0e,0x61,0x35,0x57,0xb9,0x86,0xc1,0x1d,0x9e,
    0xe1,0xf8,0x98,0x11,0x69,0xd9,0x8e,0x94,0x9b,0x1e,0x87,0xe9,0xce,0x55,0x28,0xdf,
    0x8c,0xa1,0x89,0x0d,0xbf,0xe6,0x42,0x68,0x41,0x99,0x2d,0x0f,0xb0,0x54,0xbb,0x16
  ]);
  function rotr(n, x) { return (x >>> n) | (x << (32 - n)); }
  function sha256(bytes) {
    if (typeof bytes === "string") bytes = strBytes(bytes);
    var K = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
    var h0=0x6a09e667,h1=0xbb67ae85,h2=0x3c6ef372,h3=0xa54ff53a,h4=0x510e527f,h5=0x9b05688c,h6=0x1f83d9ab,h7=0x5be0cd19;
    var l = bytes.length;
    var withPad = new Uint8Array(((l + 9 + 63) & ~63));
    withPad.set(bytes);
    withPad[l] = 0x80;
    var dv = new DataView(withPad.buffer);
    dv.setUint32(withPad.length - 4, (l * 8) >>> 0, false);
    for (var i = 0; i < withPad.length; i += 64) {
      var w = new Uint32Array(64);
      var ddv = new DataView(withPad.buffer, i, 64);
      for (var j = 0; j < 16; j++) w[j] = ddv.getUint32(j * 4, false);
      for (var j = 16; j < 64; j++) {
        var s0 = rotr(7, w[j-15]) ^ rotr(18, w[j-15]) ^ (w[j-15] >>> 3);
        var s1 = rotr(17, w[j-2]) ^ rotr(19, w[j-2]) ^ (w[j-2] >>> 10);
        w[j] = (w[j-16] + s0 + w[j-7] + s1) >>> 0;
      }
      var a=h0,b=h1,c=h2,d=h3,e=h4,f=h5,g=h6,h=h7;
      for (var j = 0; j < 64; j++) {
        var S1 = rotr(6, e) ^ rotr(11, e) ^ rotr(25, e);
        var ch = (e & f) ^ (~e & g);
        var t1 = (h + S1 + ch + K[j] + w[j]) >>> 0;
        var S0 = rotr(2, a) ^ rotr(13, a) ^ rotr(22, a);
        var maj = (a & b) ^ (a & c) ^ (b & c);
        var t2 = (S0 + maj) >>> 0;
        h=g;g=f;f=e;e=(d+t1)>>>0;d=c;c=b;b=a;a=(t1+t2)>>>0;
      }
      h0=(h0+a)>>>0;h1=(h1+b)>>>0;h2=(h2+c)>>>0;h3=(h3+d)>>>0;
      h4=(h4+e)>>>0;h5=(h5+f)>>>0;h6=(h6+g)>>>0;h7=(h7+h)>>>0;
    }
    var out = new Uint8Array(32);
    var ov = new DataView(out.buffer);
    ov.setUint32(0,h0,false);ov.setUint32(4,h1,false);ov.setUint32(8,h2,false);ov.setUint32(12,h3,false);
    ov.setUint32(16,h4,false);ov.setUint32(20,h5,false);ov.setUint32(24,h6,false);ov.setUint32(28,h7,false);
    return out;
  }
  function hmacSha256(key, data) {
    if (typeof key === "string") key = strBytes(key);
    if (typeof data === "string") data = strBytes(data);
    if (key.length > 64) key = sha256(key);
    var k = new Uint8Array(64);
    k.set(key);
    var ipad = new Uint8Array(64);
    var opad = new Uint8Array(64);
    for (var i = 0; i < 64; i++) { ipad[i] = k[i] ^ 0x36; opad[i] = k[i] ^ 0x5c; }
    var inner = new Uint8Array(64 + data.length);
    inner.set(ipad);
    inner.set(data, 64);
    var outer = new Uint8Array(96);
    outer.set(opad);
    outer.set(sha256(inner), 64);
    return sha256(outer);
  }
  function pbkdf2(password, salt, iterations, dkLen) {
    if (typeof password === "string") password = strBytes(password);
    var blocks = Math.ceil(dkLen / 32);
    var out = new Uint8Array(blocks * 32);
    for (var block = 1; block <= blocks; block++) {
      var blockBytes = new Uint8Array(4);
      new DataView(blockBytes.buffer).setUint32(0, block, false);
      var saltBlock = new Uint8Array(salt.length + 4);
      saltBlock.set(salt);
      saltBlock.set(blockBytes, salt.length);
      var u = hmacSha256(password, saltBlock);
      var t = new Uint8Array(u);
      for (var i = 1; i < iterations; i++) {
        u = hmacSha256(password, u);
        for (var j = 0; j < 32; j++) t[j] ^= u[j];
      }
      out.set(t, (block - 1) * 32);
    }
    return out.slice(0, dkLen);
  }
  function aesKeyExpand(key) {
    var Nk = 8, Nr = 14;
    var w = new Uint32Array(4 * (Nr + 1));
    for (var i = 0; i < Nk; i++) w[i] = (key[i*4]<<24)|(key[i*4+1]<<16)|(key[i*4+2]<<8)|key[i*4+3];
    var rcon = [0x01,0x02,0x04,0x08,0x10,0x20,0x40,0x80,0x1b,0x36];
    for (var i = Nk; i < 4 * (Nr + 1); i++) {
      var t = w[i - 1];
      if (i % Nk === 0) {
        t = ((t << 8) | (t >>> 24)) >>> 0;
        t = ((SBOX[(t>>>24)&0xff]<<24)|(SBOX[(t>>>16)&0xff]<<16)|(SBOX[(t>>>8)&0xff]<<8)|SBOX[t&0xff]) >>> 0;
        t ^= (rcon[i / Nk - 1] << 24) >>> 0;
      } else if (i % Nk === 4) {
        t = ((SBOX[(t>>>24)&0xff]<<24)|(SBOX[(t>>>16)&0xff]<<16)|(SBOX[(t>>>8)&0xff]<<8)|SBOX[t&0xff]) >>> 0;
      }
      w[i] = (w[i - Nk] ^ t) >>> 0;
    }
    return w;
  }
  function xtime(x) { return ((x << 1) ^ (((x >>> 7) & 1) * 0x1b)) & 0xff; }
  function mixCol(s) {
    var a = (s >>> 24) & 0xff, b = (s >>> 16) & 0xff, c = (s >>> 8) & 0xff, d = s & 0xff;
    return ((xtime(a)^xtime(b)^b^c^d)<<24|(a^xtime(b)^xtime(c)^c^d)<<16|(a^b^xtime(c)^xtime(d)^d)<<8|(xtime(a)^a^b^c^xtime(d))) >>> 0;
  }
  function aesEncryptBlock(w, block) {
    var Nr = 14;
    var s0 = ((block[0]<<24|block[1]<<16|block[2]<<8|block[3]) ^ w[0]) >>> 0;
    var s1 = ((block[4]<<24|block[5]<<16|block[6]<<8|block[7]) ^ w[1]) >>> 0;
    var s2 = ((block[8]<<24|block[9]<<16|block[10]<<8|block[11]) ^ w[2]) >>> 0;
    var s3 = ((block[12]<<24|block[13]<<16|block[14]<<8|block[15]) ^ w[3]) >>> 0;
    for (var r = 1; r < Nr; r++) {
      var t0 = ((SBOX[(s0>>>24)&0xff]<<24)|(SBOX[(s1>>>16)&0xff]<<16)|(SBOX[(s2>>>8)&0xff]<<8)|SBOX[s3&0xff]) >>> 0;
      var t1 = ((SBOX[(s1>>>24)&0xff]<<24)|(SBOX[(s2>>>16)&0xff]<<16)|(SBOX[(s3>>>8)&0xff]<<8)|SBOX[s0&0xff]) >>> 0;
      var t2 = ((SBOX[(s2>>>24)&0xff]<<24)|(SBOX[(s3>>>16)&0xff]<<16)|(SBOX[(s0>>>8)&0xff]<<8)|SBOX[s1&0xff]) >>> 0;
      var t3 = ((SBOX[(s3>>>24)&0xff]<<24)|(SBOX[(s0>>>16)&0xff]<<16)|(SBOX[(s1>>>8)&0xff]<<8)|SBOX[s2&0xff]) >>> 0;
      s0 = (mixCol(t0) ^ w[r*4]) >>> 0;
      s1 = (mixCol(t1) ^ w[r*4+1]) >>> 0;
      s2 = (mixCol(t2) ^ w[r*4+2]) >>> 0;
      s3 = (mixCol(t3) ^ w[r*4+3]) >>> 0;
    }
    var t0 = ((SBOX[(s0>>>24)&0xff]<<24)|(SBOX[(s1>>>16)&0xff]<<16)|(SBOX[(s2>>>8)&0xff]<<8)|SBOX[s3&0xff]) >>> 0;
    var t1 = ((SBOX[(s1>>>24)&0xff]<<24)|(SBOX[(s2>>>16)&0xff]<<16)|(SBOX[(s3>>>8)&0xff]<<8)|SBOX[s0&0xff]) >>> 0;
    var t2 = ((SBOX[(s2>>>24)&0xff]<<24)|(SBOX[(s3>>>16)&0xff]<<16)|(SBOX[(s0>>>8)&0xff]<<8)|SBOX[s1&0xff]) >>> 0;
    var t3 = ((SBOX[(s3>>>24)&0xff]<<24)|(SBOX[(s0>>>16)&0xff]<<16)|(SBOX[(s1>>>8)&0xff]<<8)|SBOX[s2&0xff]) >>> 0;
    s0 = (t0 ^ w[Nr*4]) >>> 0; s1 = (t1 ^ w[Nr*4+1]) >>> 0;
    s2 = (t2 ^ w[Nr*4+2]) >>> 0; s3 = (t3 ^ w[Nr*4+3]) >>> 0;
    var out = new Uint8Array(16);
    var ss = [s0, s1, s2, s3];
    for (var i = 0; i < 4; i++) {
      out[i*4] = (ss[i] >>> 24) & 0xff;
      out[i*4+1] = (ss[i] >>> 16) & 0xff;
      out[i*4+2] = (ss[i] >>> 8) & 0xff;
      out[i*4+3] = ss[i] & 0xff;
    }
    return out;
  }
  function gcmMul(x, y) {
    var z = new Uint8Array(16);
    var v = new Uint8Array(y);
    for (var i = 0; i < 128; i++) {
      if ((x[i >>> 3] >>> (7 - (i & 7))) & 1) {
        for (var j = 0; j < 16; j++) z[j] ^= v[j];
      }
      var lsb = v[15] & 1;
      for (var j = 15; j > 0; j--) v[j] = ((v[j] >>> 1) | ((v[j - 1] & 1) << 7)) & 0xff;
      v[0] >>>= 1;
      if (lsb) v[0] ^= 0xe1;
    }
    return z;
  }
  function ghash(H, data) {
    var y = new Uint8Array(16);
    for (var i = 0; i < data.length; i += 16) {
      var block = new Uint8Array(16);
      var n = Math.min(16, data.length - i);
      for (var j = 0; j < n; j++) block[j] = data[i + j];
      for (var j = 0; j < 16; j++) block[j] ^= y[j];
      y = gcmMul(block, H);
    }
    return y;
  }
  function aesGcmEncrypt(key, iv, plaintext) {
    var w = aesKeyExpand(key);
    var H = aesEncryptBlock(w, new Uint8Array(16));
    var j0 = new Uint8Array(16);
    j0.set(iv);
    j0[15] = 1;
    var ct = new Uint8Array(plaintext.length);
    var counter = new Uint8Array(j0);
    for (var i = 0; i < plaintext.length; i += 16) {
      for (var k = 15; k >= 12; k--) { counter[k] = (counter[k] + 1) & 0xff; if (counter[k]) break; }
      var stream = aesEncryptBlock(w, counter);
      var n = Math.min(16, plaintext.length - i);
      for (var j = 0; j < n; j++) ct[i + j] = plaintext[i + j] ^ stream[j];
    }
    var padLen = (16 - (ct.length % 16)) % 16;
    var lenBlock = new Uint8Array(16);
    var bitLen = ct.length * 8;
    lenBlock[12] = (bitLen >>> 24) & 0xff;
    lenBlock[13] = (bitLen >>> 16) & 0xff;
    lenBlock[14] = (bitLen >>> 8) & 0xff;
    lenBlock[15] = bitLen & 0xff;
    var ghashIn = new Uint8Array(ct.length + padLen + 16);
    ghashIn.set(ct);
    ghashIn.set(lenBlock, ct.length + padLen);
    var S = ghash(H, ghashIn);
    var tagMask = aesEncryptBlock(w, j0);
    var tag = new Uint8Array(16);
    for (var i = 0; i < 16; i++) tag[i] = S[i] ^ tagMask[i];
    var out = new Uint8Array(ct.length + 16);
    out.set(ct);
    out.set(tag, ct.length);
    return out;
  }
  function aesGcmDecrypt(key, iv, data) {
    var ct = data.subarray(0, data.length - 16);
    var tag = data.subarray(data.length - 16);
    var w = aesKeyExpand(key);
    var H = aesEncryptBlock(w, new Uint8Array(16));
    var j0 = new Uint8Array(16);
    j0.set(iv);
    j0[15] = 1;
    var padLen = (16 - (ct.length % 16)) % 16;
    var lenBlock = new Uint8Array(16);
    var bitLen = ct.length * 8;
    lenBlock[12] = (bitLen >>> 24) & 0xff;
    lenBlock[13] = (bitLen >>> 16) & 0xff;
    lenBlock[14] = (bitLen >>> 8) & 0xff;
    lenBlock[15] = bitLen & 0xff;
    var ghashIn = new Uint8Array(ct.length + padLen + 16);
    ghashIn.set(ct);
    ghashIn.set(lenBlock, ct.length + padLen);
    var S = ghash(H, ghashIn);
    var tagMask = aesEncryptBlock(w, j0);
    for (var i = 0; i < 16; i++) {
      if ((S[i] ^ tagMask[i]) !== tag[i]) throw new Error("GCM auth failed");
    }
    var pt = new Uint8Array(ct.length);
    var counter = new Uint8Array(j0);
    for (var i = 0; i < ct.length; i += 16) {
      for (var k = 15; k >= 12; k--) { counter[k] = (counter[k] + 1) & 0xff; if (counter[k]) break; }
      var stream = aesEncryptBlock(w, counter);
      var n = Math.min(16, ct.length - i);
      for (var j = 0; j < n; j++) pt[i + j] = ct[i + j] ^ stream[j];
    }
    return pt;
  }
  function strBytes(s) {
    if (typeof TextEncoder !== "undefined") return new TextEncoder().encode(s);
    var out = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) out[i] = s.charCodeAt(i) & 0xff;
    return out;
  }
  function strFromBytes(b) {
    if (typeof TextDecoder !== "undefined") return new TextDecoder().decode(b);
    var s = "";
    for (var i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
    return s;
  }


  const IMG_CDN = "https://img.cdno.my.id";
  const PLAYER = "https://netoda.tech";
  const VIDARA = "https://vidara.to";
  const EMBED_MOVIE = [
    "https://vidsrc.xyz/embed/movie/",
    "https://vidsrc.to/embed/movie/",
    "https://vidfast.pro/movie/",
    "https://embos.top/movie/?mid="
  ];
  const EMBED_TV = [
    "https://vidsrc.xyz/embed/tv/",
    "https://vidsrc.to/embed/tv/",
    "https://vidfast.pro/tv/",
    "https://embos.top/movie/?mid="
  ];
  const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
  const HEADERS = { "User-Agent": UA, Accept: "application/json, text/html, */*", "Accept-Language": "en-US,en;q=0.9" };

  function base() {
    // Hardcoded — no website picker in extension settings
    return "https://fmoviess.org";
  }
  function poster(slug, size) {
    size = size || "w_200/h_300";
    return IMG_CDN + "/thumb/" + size + "/" + slug + ".jpg";
  }
  function cover(slug) {
    return IMG_CDN + "/cover/w_1280/h_720/" + slug + ".jpg";
  }
  function itemUrl(slug, mid, type, extra) {
    var o = {
      slug: String(slug || ""),
      mid: mid != null && mid !== "" ? String(mid) : null,
      type: type || "movie"
    };
    if (extra) {
      for (var k in extra) {
        if (!Object.prototype.hasOwnProperty.call(extra, k)) continue;
        var v = extra[k];
        // Only JSON-safe primitives / arrays of primitives in the url payload
        if (v == null) continue;
        if (k === "servers" && Array.isArray(v)) {
          o.servers = v.map(function (s) {
            if (s && typeof s === "object") return String(s.id != null ? s.id : s);
            return String(s);
          });
          continue;
        }
        if (typeof v === "object") continue;
        o[k] = v;
      }
    }
    return JSON.stringify(o);
  }
  function parseUrl(url) {
    try { return JSON.parse(url); } catch (e) {
      return { slug: String(url).replace(/^.*\//, "").replace(/\/$/, ""), type: "movie" };
    }
  }
  function toItem(row) {
    var slug = row.s || row.link || "";
    if (!slug) return null;
    var title = row.t || row.title || slug;
    var isSeries = row.d === "s" || /season/i.test(title);
    var midMatch = String(slug).match(/-(\d+)$/);
    var mid = midMatch ? midMatch[1] : null;
    return new MultimediaItem({
      title: title,
      url: itemUrl(slug, mid, isSeries ? "series" : "movie", { title: title, year: row.y ? Number(row.y) : undefined }),
      posterUrl: poster(slug),
      type: isSeries ? "series" : "movie",
      year: row.y ? Number(row.y) : undefined,
      description: row.q ? "Quality: " + row.q : ""
    });
  }

  function safeJson(body) {
    if (body == null) return null;
    if (typeof body === "object") return body;
    var s = String(body).trim();
    if (!s || (s[0] !== "{" && s[0] !== "[")) {
      throw new Error(s.slice(0, 40) || "empty response");
    }
    return JSON.parse(s);
  }
  async function httpJson(url, opt) {
    opt = opt || {};
    var headers = Object.assign({}, HEADERS, opt.headers || {});
    var method = opt.method || "GET";
    // fetch
    if (typeof fetch === "function") {
      try {
        var r = await fetch(url, { method: method, headers: headers, body: opt.body || undefined });
        var text = await r.text();
        return safeJson(text);
      } catch (e) {}
    }
    // GET via http_get
    if (typeof http_get === "function" && method === "GET") {
      try {
        var res = await http_get(url, headers);
        var body = res && res.body !== undefined ? res.body : res;
        return safeJson(body);
      } catch (e2) {}
    }
    // POST via http_post — try several argument shapes
    if (typeof http_post === "function" && method === "POST") {
      var attempts = [
        function () { return http_post(url, opt.body, headers); },
        function () { return http_post(url, headers, opt.body); },
        function () {
          var obj = opt.body;
          try { if (typeof obj === "string") obj = JSON.parse(obj); } catch (e) {}
          return http_post(url, obj, headers);
        }
      ];
      for (var ai = 0; ai < attempts.length; ai++) {
        try {
          var res2 = await attempts[ai]();
          var body2 = res2 && res2.body !== undefined ? res2.body : res2;
          var parsed = safeJson(body2);
          if (parsed) return parsed;
        } catch (e3) {}
      }
    }
    return null;
  }
  async function httpText(url, headers) {
    headers = Object.assign({}, HEADERS, headers || {});
    if (typeof fetch === "function") {
      try {
        var r = await fetch(url, { headers: headers });
        return await r.text();
      } catch (e) {}
    }
    if (typeof http_get === "function") {
      try {
        var res = await http_get(url, headers);
        var body = res && res.body !== undefined ? res.body : res;
        return typeof body === "string" ? body : String(body || "");
      } catch (e2) {}
    }
    return null;
  }

  function bytesToHex(bytes) {
    var s = "";
    for (var i = 0; i < bytes.length; i++) s += ("0" + (bytes[i] & 0xff).toString(16)).slice(-2);
    return s;
  }
  function hexToBytes(hex) {
    var out = new Uint8Array(hex.length / 2);
    for (var i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
    return out;
  }
  function getRandomValues(len) {
    var a = new Uint8Array(len);
    if (typeof crypto !== "undefined" && crypto.getRandomValues) crypto.getRandomValues(a);
    else for (var i = 0; i < len; i++) a[i] = (Math.random() * 256) | 0;
    return a;
  }

  function buildGetPath(mid, ep, server) {
    var plain = String(mid) + "+" + String(ep) + "+" + String(server) + "+" + Math.floor(Date.now() / 1000);
    var salt = getRandomValues(8);
    var iv = getRandomValues(12);
    var key = pbkdf2("player", salt, 1000, 32);
    var cipher = aesGcmEncrypt(key, iv, strBytes(plain));
    return bytesToHex(salt) + "-" + bytesToHex(iv) + "-" + bytesToHex(cipher);
  }
  function decryptPlayerBlob(blob) {
    try {
      var parts = String(blob).split("-");
      if (parts.length < 3) return null;
      var salt = hexToBytes(parts[0]);
      var iv = hexToBytes(parts[1]);
      var data = hexToBytes(parts.slice(2).join(""));
      if (data.length < 17) return null;
      var key = pbkdf2("player", salt, 1000, 32);
      return strFromBytes(aesGcmDecrypt(key, iv, data));
    } catch (e) { return null; }
  }

  async function resolveVidara(filecode) {
    if (!filecode) return null;
    filecode = String(filecode).replace(/[^A-Za-z0-9]/g, "");
    if (filecode.length < 6) return null;
    var endpoint = VIDARA + "/api/stream";
    var postHeaders = {
      "Content-Type": "application/json",
      Accept: "application/json, */*",
      Referer: VIDARA + "/e/" + filecode,
      Origin: VIDARA,
      "User-Agent": UA
    };
    var bodyStr = JSON.stringify({ filecode: filecode, device: "web" });
    var stream = null;
    try {
      stream = await httpJson(endpoint, { method: "POST", headers: postHeaders, body: bodyStr });
    } catch (e) {}
    if ((!stream || !stream.streaming_url) && typeof fetch === "function") {
      try {
        var r = await fetch(endpoint, { method: "POST", headers: postHeaders, body: bodyStr });
        stream = safeJson(await r.text());
      } catch (e2) {}
    }
    if ((!stream || !stream.streaming_url) && typeof http_post === "function") {
      try {
        var res = await http_post(endpoint, bodyStr, postHeaders);
        var b = res && res.body !== undefined ? res.body : res;
        stream = safeJson(b);
      } catch (e3) {}
    }
    if (!stream || !stream.streaming_url) return null;
    var su = String(stream.streaming_url);
    if (su.indexOf("http") !== 0) return null;
    if (su.indexOf(".m3u8") === -1 && su.indexOf(".mp4") === -1 && su.indexOf("/hls/") === -1) return null;
    return {
      url: su,
      name: "Vidara",
      headers: { Referer: VIDARA + "/", Origin: VIDARA, "User-Agent": UA }
    };
  }

  async function tryNetodaServer(mid, ep, server) {
    var path = buildGetPath(mid, ep, server);
    var json = null;
    try {
      json = await httpJson(PLAYER + "/get/" + path, {
        headers: { Referer: PLAYER + "/watch/?v" + server + ep, "User-Agent": UA, Accept: "*/*" }
      });
    } catch (e) { return null; }
    if (!json || json.code !== 200 || !json.info) return null;

    // Netoda direct (preferred when healthy)
    if (json.mode === "direct") {
      var directUrl = PLAYER + "/hls/" + json.info + "/master.m3u8";
      var headers = { Referer: PLAYER + "/", "User-Agent": UA };
      var body = await httpText(directUrl, headers);
      if (!body || body.indexOf("#EXTM3U") === -1) return null;
      return {
        url: directUrl,
        name: "Netoda",
        server: String(server),
        headers: headers
      };
    }

    // Vidara embed (works for some titles; sometimes a placeholder reel)
    if (json.mode === "embed") {
      var decoded = decryptPlayerBlob(json.info);
      if (!decoded) return null;
      decoded = String(decoded).trim();
      var filecode = null;
      var m = decoded.match(/vidara\.to\/e\/([A-Za-z0-9]+)/i);
      if (m) filecode = m[1];
      else if (/^[A-Za-z0-9]{8,20}$/.test(decoded)) filecode = decoded;
      if (!filecode) return null;
      var v = await resolveVidara(filecode);
      if (v) {
        v.server = String(server);
        return v;
      }
    }
    return null;
  }

  async function getHome(cb) {
    try {
      var data = await httpJson(base() + "/index.json");
      var list = Array.isArray(data) ? data : [];
      var latest = [], series = [], movies = [];
      for (var i = 0; i < list.length && latest.length < 48; i++) {
        var item = toItem(list[i]);
        if (!item) continue;
        latest.push(item);
        if (item.type === "series" && series.length < 30) series.push(item);
        if (item.type === "movie" && movies.length < 30) movies.push(item);
      }
      cb({ success: true, data: { Trending: latest.slice(0, 20), Latest: latest, Series: series, Movies: movies } });
    } catch (e) {
      cb({ success: false, errorCode: "HOME_ERROR", message: String(e && e.message ? e.message : e) });
    }
  }

  async function search(query, cb) {
    try {
      var raw = String(query || "").trim();
      if (!raw) return cb({ success: true, data: [] });
      var rows = [];
      try {
        var json = await httpJson(base() + "/searching?q=" + encodeURIComponent(raw) + "&limit=40&offset=0");
        rows = (json && json.data) || [];
      } catch (e) {
        var all = await httpJson(base() + "/index.json");
        var needle = raw.toLowerCase();
        rows = (Array.isArray(all) ? all : []).filter(function (r) {
          return (r.t || r.title || "").toLowerCase().indexOf(needle) !== -1;
        }).slice(0, 40);
      }
      var out = [];
      for (var i = 0; i < rows.length; i++) {
        var item = toItem(rows[i]);
        if (item) out.push(item);
      }
      cb({ success: true, data: out });
    } catch (e) {
      cb({ success: false, errorCode: "SEARCH_ERROR", message: String(e && e.message ? e.message : e) });
    }
  }

  
  // Strip " - Season N" / " Season N" from series title for metadata lookup
  function seriesBaseTitle(title) {
    return String(title || "")
      .replace(/\s*[-:]\s*Season\s*\d+.*$/i, "")
      .replace(/\s+Season\s*\d+.*$/i, "")
      .replace(/\s*\(\d{4}\)\s*$/, "")
      .trim();
  }

  // TVMaze (free, no key) — real episode titles, summaries, air dates
  async function fetchTvMazeEpisodes(showTitle, seasonNum) {
    try {
      var q = encodeURIComponent(seriesBaseTitle(showTitle));
      if (!q) return {};
      var show = await httpJson(
        "https://api.tvmaze.com/singlesearch/shows?q=" + q + "&embed=episodes"
      );
      if (!show || !show._embedded || !show._embedded.episodes) return {};
      var map = {};
      var list = show._embedded.episodes;
      for (var i = 0; i < list.length; i++) {
        var e = list[i];
        if (Number(e.season) !== Number(seasonNum)) continue;
        var num = Number(e.number) || 0;
        var summary = e.summary
          ? String(e.summary).replace(/<[^>]+>/g, "").trim()
          : "";
        map[num] = {
          name: e.name || ("Episode " + num),
          summary: summary,
          runtime: e.runtime || null,
          airDate: e.airdate || null,
          rating: e.rating && e.rating.average ? e.rating.average : null,
          image:
            (e.image && (e.image.medium || e.image.original)) || null
        };
      }
      return map;
    } catch (e) {
      return {};
    }
  }


  function durationToMinutes(s) {
    if (s == null || s === "") return null;
    if (typeof s === "number" && isFinite(s)) return Math.round(s);
    var t = String(s).trim();
    if (/^\d+$/.test(t)) return parseInt(t, 10);
    var h = 0, m = 0;
    var hm = t.match(/(\d+)\s*h/i);
    var mm = t.match(/(\d+)\s*m/i);
    if (hm) h = parseInt(hm[1], 10);
    if (mm) m = parseInt(mm[1], 10);
    if (!hm && !mm) {
      var n = parseFloat(t);
      return isFinite(n) ? Math.round(n) : null;
    }
    return h * 60 + m;
  }
  // Dart often wants List<Map> not List<String> or a plain String
  function toNameMaps(val) {
    if (val == null || val === "") return undefined;
    var parts;
    if (Array.isArray(val)) {
      parts = val;
    } else {
      parts = String(val).split(/,/);
    }
    var out = [];
    var seen = {};
    for (var i = 0; i < parts.length; i++) {
      var name = "";
      var p = parts[i];
      if (p == null) continue;
      if (typeof p === "object") {
        name = String(p.name || p.title || p.label || "").trim();
      } else {
        name = String(p).trim();
      }
      if (!name || seen[name]) continue;
      seen[name] = true;
      out.push({ name: name });
    }
    return out.length ? out : undefined;
  }
  function stripTags(s) {
    return String(s || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  }
  function metaField(html, label) {
    // <strong>Label: </strong>value</p>
    var re = new RegExp("<strong>\\s*" + label + "\\s*:?\\s*</strong>\\s*([\\s\\S]*?)</p>", "i");
    var m = html.match(re);
    if (!m) return "";
    return stripTags(m[1]).replace(/\s*,\s*/g, ", ").trim();
  }
  function parseFilmMeta(html) {
    var meta = {
      title: "",
      description: "",
      year: null,
      rating: null,
      duration: "",
      quality: "",
      country: "",
      actors: "",
      directors: "",
      genres: [],
      episodeCount: null
    };
    var ogTitle = html.match(/property=["']og:title["'][^>]*content=["']([^"']+)/i)
      || html.match(/content=["']([^"']+)["'][^>]*property=["']og:title["']/i);
    if (ogTitle) {
      meta.title = ogTitle[1]
        .replace(/^Watch\s+/i, "")
        .replace(/\s+Full Movie on Fmovies.*/i, "")
        .replace(/\s+on\s+Fmovies.*/i, "")
        .trim();
    }
    var ogDesc = html.match(/property=["']og:description["'][^>]*content=["']([^"']+)/i)
      || html.match(/content=["']([^"']+)["'][^>]*property=["']og:description["']/i);
    if (ogDesc) meta.description = ogDesc[1].trim();
    if (!meta.description) {
      var md = html.match(/name=["']description["'][^>]*content=["']([^"']+)/i);
      if (md) meta.description = md[1].trim();
    }
    var ogTime = html.match(/property=["']og:updated_time["'][^>]*content=["']([^"']+)/i);
    if (ogTime) {
      var y = ogTime[1].match(/(19|20)\d{2}/);
      if (y) meta.year = Number(y[0]);
    }
    meta.actors = metaField(html, "Actor");
    meta.directors = metaField(html, "Director");
    meta.country = metaField(html, "Country");
    meta.duration = metaField(html, "Duration");
    meta.quality = metaField(html, "Quality");
    var epCount = metaField(html, "Episode");
    if (epCount) {
      var en = epCount.match(/(\d+)/);
      if (en) meta.episodeCount = Number(en[1]);
    }
    // IMDb score in page (e.g. ratingValue 9.5 or badge text)
    var rv = html.match(/ratingValue["']?\s*[:=]\s*["']?([\d.]+)/i);
    if (rv) meta.rating = Number(rv[1]);
    if (meta.rating == null) {
      var imdbLine = metaField(html, "IMDb") || metaField(html, "IMDB");
      if (imdbLine) {
        var ir = imdbLine.match(/([\d.]+)/);
        if (ir) meta.rating = Number(ir[1]);
      }
    }
    // Genres: links inside the info card near Genre label
    var genreBlock = html.match(/<strong>\s*Genre\s*:?\s*<\/strong>([\s\S]*?)<\/p>/i);
    if (genreBlock) {
      var gRe = /\/genre\/([^/"']+)\//gi;
      var gm;
      var seen = {};
      while ((gm = gRe.exec(genreBlock[1])) !== null) {
        var g = gm[1].replace(/-/g, " ");
        g = g.charAt(0).toUpperCase() + g.slice(1);
        if (!seen[g]) {
          seen[g] = true;
          meta.genres.push(g);
        }
      }
      if (meta.genres.length === 0) {
        var plain = stripTags(genreBlock[1]);
        if (plain) meta.genres = plain.split(/,/).map(function (x) { return x.trim(); }).filter(Boolean);
      }
    }
    return meta;
  }
  function buildDescription(meta) {
    var parts = [];
    if (meta.description) parts.push(meta.description);
    var facts = [];
    if (meta.rating != null) facts.push("IMDb " + meta.rating);
    if (meta.quality) facts.push(meta.quality);
    if (meta.duration) facts.push(meta.duration);
    if (meta.country) facts.push(meta.country);
    if (meta.genres && meta.genres.length) facts.push(meta.genres.join(", "));
    if (meta.directors) facts.push("Director: " + meta.directors);
    if (meta.actors) facts.push("Cast: " + meta.actors);
    if (meta.episodeCount) facts.push(meta.episodeCount + " episodes");
    if (facts.length) parts.push(facts.join(" · "));
    return parts.join("\n\n");
  }

  async function load(url, cb) {
    try {
      var info = parseUrl(url);
      var slug = info.slug;
      if (!slug) return cb({ success: false, errorCode: "NO_SLUG", message: "Missing title slug" });
      var htmlStr = await httpText(base() + "/film/" + slug + "/");
      var film = parseFilmMeta(htmlStr);
      var title = film.title || info.title || slug;
      if (!film.title) {
        var titleMatch = htmlStr.match(/<title[^>]*>([^<]+)/i);
        if (titleMatch) title = titleMatch[1].replace(/^Watch\s+/i, "").replace(/\s+on\s+Fmovies.*/i, "").replace(/\s*\|\s*.*$/, "").trim();
      }
      var mid = info.mid;
      var midMatch = htmlStr.match(/data-mid\s*=\s*["']?(\d+)/i);
      if (midMatch) mid = midMatch[1];
      if (!mid) { var mm = String(slug).match(/-(\d+)$/); if (mm) mid = mm[1]; }
      var description = buildDescription(film);
      var year = film.year || info.year;
      if (!year) { var y2 = htmlStr.match(/\b(19|20)\d{2}\b/); if (y2) year = Number(y2[0]); }
      var rating = film.rating;
      var duration = film.duration;
      var genres = film.genres || [];
      var yearNum = (year != null && year !== "") ? Number(year) : null;
      if (yearNum != null && !isFinite(yearNum)) yearNum = null;
      else if (yearNum != null) yearNum = Math.round(yearNum);
      var ratingNum = (rating != null && rating !== "") ? Number(rating) : null;
      if (ratingNum != null && !isFinite(ratingNum)) ratingNum = null;
      var durationMin = durationToMinutes(duration);
      var servers = [];
      var srvRe = /id=["']?srv-(\d+)["']?[^>]*>([^<]*)</gi;
      var sm;
      while ((sm = srvRe.exec(htmlStr)) !== null) {
        servers.push({ id: sm[1], name: (sm[2] || "Server " + sm[1]).trim() || "Server " + sm[1] });
      }
      if (servers.length === 0) for (var s = 1; s <= 7; s++) servers.push({ id: String(s), name: "Server " + s });
      var eps = [];
      var epRe = /id=["']?ep-(\d+)["']?([^>]*)>/gi;
      var em;
      while ((em = epRe.exec(htmlStr)) !== null) {
        var attrs = em[2] || "";
        var tm = attrs.match(/title=["']([^"']*)["']/i);
        eps.push({ id: em[1], title: (tm && tm[1]) ? tm[1] : ("Episode " + em[1]) });
      }
      var modeMatch = htmlStr.match(/data-mode\s*=\s*["']?([^"\'\s>]+)/i);
      var dataMode = modeMatch ? modeMatch[1] : null;
      var isSeries = dataMode === "tv" || eps.length > 1 || /season/i.test(title) || info.type === "series";
      var episodes;
      // Season number from slug (season-5) or title ("Season 5")
      var seasonNum = 1;
      var smSlug = String(slug).match(/season[_-]?(\d+)/i);
      if (smSlug) seasonNum = parseInt(smSlug[1], 10) || 1;
      else {
        var smTitle = String(title).match(/season\s*(\d+)/i);
        if (smTitle) seasonNum = parseInt(smTitle[1], 10) || 1;
      }

      if (isSeries && eps.length > 0) {
        var metaMap = await fetchTvMazeEpisodes(title, seasonNum);
        episodes = eps.map(function (ep) {
          var epNum = parseInt(ep.id, 10) || 0;
          var meta = metaMap[epNum] || {};
          var epName = meta.name || ep.title || ("Episode " + epNum);
          var payload = {
            name: String(epName),
            title: String(epName),
            url: itemUrl(slug, mid, "series", {
              ep: String(ep.id),
              season: Number(seasonNum) || 1,
              title: title,
              year: yearNum != null ? yearNum : year
            }),
            season: Number(seasonNum) || 1,
            episode: Number(epNum) || 0,
            description: String(meta.summary || ""),
            posterUrl: meta.image || poster(slug),
            type: "episode"
          };
          // Do not attach servers array inside url JSON if host expects Map-only primitives
          if (typeof Episode === "function") {
            return new Episode(payload);
          }
          return new MultimediaItem(payload);
        });
      } else {
        episodes = [new MultimediaItem({
          title: String(title),
          url: itemUrl(slug, mid, "movie", {
            ep: "1",
            title: title,
            year: yearNum != null ? yearNum : year
          }),
          posterUrl: poster(slug),
          type: "movie"
        })];
      }
      // Structured metadata: List<Map{name}> (not String, not List<String>)
      var itemPayload = {
        title: String(title || ""),
        url: String(url || ""),
        posterUrl: poster(slug),
        bannerUrl: cover(slug),
        type: isSeries ? "series" : "movie",
        description: String(description || ""),
        episodes: episodes
      };
      if (yearNum != null) itemPayload.year = yearNum;
      if (ratingNum != null) itemPayload.rating = ratingNum;
      if (durationMin != null) itemPayload.duration = durationMin;

      var genreMaps = toNameMaps(genres.length ? genres : film.genres);
      var castMaps = toNameMaps(film.actors);
      var directorMaps = toNameMaps(film.directors);
      var countryMaps = toNameMaps(film.country);

      if (genreMaps) {
        itemPayload.genres = genreMaps;
        itemPayload.genre = genreMaps; // some hosts use singular
      }
      if (castMaps) {
        itemPayload.cast = castMaps;
        itemPayload.actors = castMaps;
      }
      if (directorMaps) {
        itemPayload.directors = directorMaps;
        itemPayload.director = directorMaps;
      }
      if (countryMaps) {
        itemPayload.countries = countryMaps;
        itemPayload.country = countryMaps;
      }
      if (film.quality) itemPayload.quality = String(film.quality);

      cb({
        success: true,
        data: new MultimediaItem(itemPayload)
      });
    } catch (e) {
      cb({ success: false, errorCode: "LOAD_ERROR", message: String(e && e.message ? e.message : e) });
    }
  }

  async function loadStreams(url, cb) {
    try {
      var info = parseUrl(url);
      var mid = info.mid;
      if (!mid && info.slug) {
        var m = String(info.slug).match(/-(\d+)$/);
        if (m) mid = m[1];
      }
      var ep = String(info.ep || "1");
      if (!mid) {
        return cb({ success: false, errorCode: "NO_MID", message: "Movie id missing — open the title from search first" });
      }
      var serverIds = [];
      if (info.servers && info.servers.length) {
        for (var i = 0; i < info.servers.length; i++) serverIds.push(String(info.servers[i].id || info.servers[i]));
      }
      for (var s = 1; s <= 7; s++) {
        var id = String(s);
        if (serverIds.indexOf(id) === -1) serverIds.push(id);
      }
      var streams = [];
      var seen = {};
      var errors = [];
      for (var i = 0; i < serverIds.length; i++) {
        var sid = serverIds[i];
        try {
          var result = await tryNetodaServer(mid, ep, sid);
          if (result && result.url) {
            var u = String(result.url);
            if (u.indexOf("vidara.to/e/") !== -1 || u.indexOf("/watch/?") !== -1) continue;
            var label = result.name || "Netoda";
            // Only one Netoda and one Vidara (different CDN tokens used to create duplicates)
            if (seen[label]) continue;
            var pathKey = u.split("?")[0];
            if (seen[pathKey]) continue;
            seen[label] = true;
            seen[pathKey] = true;
            seen[u] = true;
            streams.push(new StreamResult({
              url: result.url,
              quality: label,
              name: label,
              title: label,
              server: label,
              source: label,
              sourceName: label,
              headers: result.headers || { Referer: PLAYER + "/", "User-Agent": UA }
            }));
          }
        } catch (e) {
          errors.push("s" + sid + ":" + String(e && e.message ? e.message : e));
        }
      }
      // Netoda first (more faithful), Vidara second
      streams.sort(function (a, b) {
        function rank(s) {
          var n = String(s.quality || s.name || "");
          if (n.indexOf("Netoda") === 0) return 0;
          if (n.indexOf("Vidara") === 0) return 1;
          return 2;
        }
        return rank(a) - rank(b);
      });
      // Fallback: third-party embeds via built-in extractors (older titles often 404 on Netoda)
      if (streams.length === 0 && typeof loadExtractor === "function") {
        var title = info.title || info.slug || "";
        var embeds = (info.type === "series") ? EMBED_TV : EMBED_MOVIE;
        for (var ei = 0; ei < embeds.length; ei++) {
          var embedUrl = embeds[ei] + mid;
          if (info.type === "series" && embeds[ei].indexOf("/tv/") !== -1) {
            embedUrl = embeds[ei] + mid + "/" + (info.season || "1") + "/" + ep;
          }
          try {
            var extracted = await loadExtractor(embedUrl);
            if (Array.isArray(extracted)) {
              for (var ej = 0; ej < extracted.length; ej++) {
                if (extracted[ej] && extracted[ej].url && !seen[extracted[ej].url]) {
                  seen[extracted[ej].url] = true;
                  streams.push(extracted[ej]);
                }
              }
            }
          } catch (e) {}
        }
      }

      if (streams.length === 0) {
        return cb({
          success: false, errorCode: "NO_STREAMS",
          message: "No streams (mid=" + mid + " ep=" + ep + "). Netoda has no file for this id (common for older series). " + (errors.length ? errors.slice(0, 2).join("; ") : "")
        });
      }
      cb({ success: true, data: streams });
    } catch (e) {
      cb({ success: false, errorCode: "STREAM_ERROR", message: String(e && e.message ? e.message : e) });
    }
  }

  globalThis.getHome = getHome;
  globalThis.search = search;
  globalThis.load = load;
  globalThis.loadStreams = loadStreams;
})();
