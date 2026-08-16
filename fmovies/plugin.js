(function () {
  "use strict";

  const IMG_CDN = "https://img.cdno.my.id";
  const PLAYER = "https://netoda.tech";
  const VIDARA = "https://vidara.to";
  const UA =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
  const HEADERS = {
    "User-Agent": UA,
    Accept: "application/json, text/html, */*",
    "Accept-Language": "en-US,en;q=0.9",
  };

  function base() {
    return (
      (typeof manifest !== "undefined" && manifest.baseUrl) ||
      "https://fmoviess.org"
    ).replace(/\/$/, "");
  }

  function poster(slug, size) {
    size = size || "w_200/h_300";
    return IMG_CDN + "/thumb/" + size + "/" + slug + ".jpg";
  }

  function cover(slug) {
    return IMG_CDN + "/cover/w_1280/h_720/" + slug + ".jpg";
  }

  function itemUrl(slug, mid, type, extra) {
    const o = {
      slug: slug,
      mid: mid || null,
      type: type || "movie",
    };
    if (extra) {
      for (const k in extra) o[k] = extra[k];
    }
    return JSON.stringify(o);
  }

  function parseUrl(url) {
    try {
      return JSON.parse(url);
    } catch (e) {
      return {
        slug: String(url).replace(/^.*\//, "").replace(/\/$/, ""),
        type: "movie",
      };
    }
  }

  function toItem(row) {
    const slug = row.s || row.link || "";
    if (!slug) return null;
    const title = row.t || row.title || slug;
    const isSeries = row.d === "s" || /season/i.test(title);
    const midMatch = String(slug).match(/-(\d+)$/);
    const mid = midMatch ? midMatch[1] : null;

    return new MultimediaItem({
      title: title,
      url: itemUrl(slug, mid, isSeries ? "series" : "movie", {
        title: title,
        year: row.y ? Number(row.y) : undefined,
      }),
      posterUrl: poster(slug),
      type: isSeries ? "series" : "movie",
      year: row.y ? Number(row.y) : undefined,
      description: row.q ? "Quality: " + row.q : "",
    });
  }

  // ---------- HTTP ----------
  async function httpJson(url, opt) {
    opt = opt || {};
    const headers = Object.assign({}, HEADERS, opt.headers || {});
    const method = opt.method || "GET";
    if (typeof fetch === "function") {
      const r = await fetch(url, {
        method: method,
        headers: headers,
        body: opt.body || undefined,
      });
      if (!r.ok) throw new Error("HTTP " + r.status);
      return await r.json();
    }
    if (typeof http_get === "function" && method === "GET") {
      const res = await http_get(url, headers);
      const body = res && res.body !== undefined ? res.body : res;
      return typeof body === "string" ? JSON.parse(body) : body;
    }
    if (typeof http_post === "function" && method === "POST") {
      const res = await http_post(url, opt.body, headers);
      const body = res && res.body !== undefined ? res.body : res;
      return typeof body === "string" ? JSON.parse(body) : body;
    }
    throw new Error("No HTTP client available in runtime");
  }

  async function httpText(url) {
    if (typeof fetch === "function") {
      const r = await fetch(url, { headers: HEADERS });
      if (!r.ok) throw new Error("HTTP " + r.status);
      return await r.text();
    }
    if (typeof http_get === "function") {
      const res = await http_get(url, HEADERS);
      const body = res && res.body !== undefined ? res.body : res;
      return typeof body === "string" ? body : String(body || "");
    }
    throw new Error("No HTTP client available in runtime");
  }

  function bytesToHex(bytes) {
    return Array.from(bytes)
      .map(function (b) {
        return ("0" + (b & 0xff).toString(16)).slice(-2);
      })
      .join("");
  }

  function hexToBytes(hex) {
    const out = new Uint8Array(hex.length / 2);
    for (let i = 0; i < out.length; i++) {
      out[i] = parseInt(hex.substr(i * 2, 2), 16);
    }
    return out;
  }

  function getSubtle() {
    if (typeof crypto !== "undefined" && crypto.subtle) return crypto.subtle;
    if (
      typeof globalThis !== "undefined" &&
      globalThis.crypto &&
      globalThis.crypto.subtle
    )
      return globalThis.crypto.subtle;
    return null;
  }

  function getRandomValues(len) {
    const a = new Uint8Array(len);
    if (typeof crypto !== "undefined" && crypto.getRandomValues) {
      crypto.getRandomValues(a);
    } else {
      for (let i = 0; i < len; i++) a[i] = (Math.random() * 256) | 0;
    }
    return a;
  }

  // PBKDF2("player") + AES-GCM  — used for /get/ and decrypting embed info
  async function derivePlayerKey(salt) {
    const subtle = getSubtle();
    if (!subtle) throw new Error("WebCrypto unavailable");
    const enc = new TextEncoder();
    const baseKey = await subtle.importKey(
      "raw",
      enc.encode("player"),
      "PBKDF2",
      false,
      ["deriveKey"]
    );
    return subtle.deriveKey(
      { name: "PBKDF2", salt: salt, iterations: 1000, hash: "SHA-256" },
      baseKey,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  }

  async function buildGetPath(mid, ep, server) {
    const subtle = getSubtle();
    if (!subtle) throw new Error("WebCrypto unavailable");
    const plain =
      String(mid) +
      "+" +
      String(ep) +
      "+" +
      String(server) +
      "+" +
      Math.floor(Date.now() / 1000);
    const salt = getRandomValues(8);
    const iv = getRandomValues(12);
    const key = await derivePlayerKey(salt);
    const cipher = await subtle.encrypt(
      { name: "AES-GCM", iv: iv },
      key,
      new TextEncoder().encode(plain)
    );
    return (
      bytesToHex(salt) +
      "-" +
      bytesToHex(iv) +
      "-" +
      bytesToHex(new Uint8Array(cipher))
    );
  }

  async function decryptPlayerBlob(blob) {
    const subtle = getSubtle();
    if (!subtle) return null;
    const parts = String(blob).split("-");
    if (parts.length < 3) return null;
    const salt = hexToBytes(parts[0]);
    const iv = hexToBytes(parts[1]);
    const data = hexToBytes(parts.slice(2).join(""));
    if (data.length < 17) return null;
    try {
      const key = await derivePlayerKey(salt);
      const pt = await subtle.decrypt(
        { name: "AES-GCM", iv: iv },
        key,
        data
      );
      return new TextDecoder().decode(pt);
    } catch (e) {
      return null;
    }
  }

  async function tryNetodaServer(mid, ep, server) {
    const path = await buildGetPath(mid, ep, server);
    const json = await httpJson(PLAYER + "/get/" + path, {
      headers: {
        Referer: PLAYER + "/watch/?v" + server + ep,
        "User-Agent": UA,
        Accept: "*/*",
      },
    });
    if (!json || json.code !== 200 || !json.info) return null;

    if (json.mode === "direct") {
      return {
        url: PLAYER + "/hls/" + json.info + "/master.m3u8",
        name: "Server " + server + " (Direct)",
        headers: { Referer: PLAYER + "/", "User-Agent": UA },
      };
    }

    // embed: info decrypts to e.g. https://vidara.to/e/FILECODE-timestamp
    if (json.mode === "embed") {
      const decoded = await decryptPlayerBlob(json.info);
      if (decoded) {
        const m = decoded.match(/vidara\.to\/e\/([A-Za-z0-9]+)/);
        if (m) {
          const filecode = m[1];
          try {
            const stream = await httpJson(VIDARA + "/api/stream", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Referer: VIDARA + "/e/" + filecode,
                "User-Agent": UA,
              },
              body: JSON.stringify({ filecode: filecode, device: "web" }),
            });
            if (stream && stream.streaming_url) {
              return {
                url: stream.streaming_url,
                name: "Server " + server + " (Vidara)",
                headers: {
                  Referer: VIDARA + "/",
                  "User-Agent": UA,
                },
              };
            }
          } catch (e) {
            /* fall through */
          }
        }
      }
    }
    return null;
  }

  // ---------- getHome ----------
  async function getHome(cb) {
    try {
      const data = await httpJson(base() + "/index.json");
      const list = Array.isArray(data) ? data : [];
      const latest = [];
      const series = [];
      const movies = [];
      for (let i = 0; i < list.length && latest.length < 48; i++) {
        const item = toItem(list[i]);
        if (!item) continue;
        latest.push(item);
        if (item.type === "series" && series.length < 30) series.push(item);
        if (item.type === "movie" && movies.length < 30) movies.push(item);
      }
      cb({
        success: true,
        data: {
          Trending: latest.slice(0, 20),
          Latest: latest,
          Series: series,
          Movies: movies,
        },
      });
    } catch (e) {
      cb({
        success: false,
        errorCode: "HOME_ERROR",
        message: String(e && e.message ? e.message : e),
      });
    }
  }

  // ---------- search ----------
  async function search(query, cb) {
    try {
      const raw = String(query || "").trim();
      if (!raw) return cb({ success: true, data: [] });
      let rows = [];
      try {
        const json = await httpJson(
          base() +
            "/searching?q=" +
            encodeURIComponent(raw) +
            "&limit=40&offset=0"
        );
        rows = (json && json.data) || [];
      } catch (e) {
        const all = await httpJson(base() + "/index.json");
        const needle = raw.toLowerCase();
        rows = (Array.isArray(all) ? all : [])
          .filter(function (r) {
            return (r.t || r.title || "").toLowerCase().indexOf(needle) !== -1;
          })
          .slice(0, 40);
      }
      const out = [];
      for (let i = 0; i < rows.length; i++) {
        const item = toItem(rows[i]);
        if (item) out.push(item);
      }
      cb({ success: true, data: out });
    } catch (e) {
      cb({
        success: false,
        errorCode: "SEARCH_ERROR",
        message: String(e && e.message ? e.message : e),
      });
    }
  }

  // ---------- load ----------
  async function load(url, cb) {
    try {
      const info = parseUrl(url);
      const slug = info.slug;
      if (!slug) {
        return cb({
          success: false,
          errorCode: "NO_SLUG",
          message: "Missing title slug",
        });
      }

      const pageUrl = base() + "/film/" + slug + "/";
      const htmlStr = await httpText(pageUrl);

      let title = info.title || slug;
      const titleMatch = htmlStr.match(/<title[^>]*>([^<]+)/i);
      if (titleMatch) {
        title = titleMatch[1]
          .replace(/^Watch\s+/i, "")
          .replace(/\s+on\s+Fmovies.*/i, "")
          .replace(/\s*\|\s*.*$/, "")
          .trim();
      }

      let mid = info.mid;
      const midMatch = htmlStr.match(/data-mid\s*=\s*["']?(\d+)/i);
      if (midMatch) mid = midMatch[1];
      if (!mid) {
        const m = String(slug).match(/-(\d+)$/);
        if (m) mid = m[1];
      }

      let description = "";
      const descMatch = htmlStr.match(
        /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)/i
      );
      if (descMatch) description = descMatch[1];

      let year = info.year;
      if (!year) {
        const y2 = htmlStr.match(/\b(19|20)\d{2}\b/);
        if (y2) year = Number(y2[0]);
      }

      const servers = [];
      const srvRe = /id=["']srv-(\d+)["'][^>]*>([^<]*)</gi;
      let sm;
      while ((sm = srvRe.exec(htmlStr)) !== null) {
        servers.push({
          id: sm[1],
          name: (sm[2] || "Server " + sm[1]).trim() || "Server " + sm[1],
        });
      }
      if (servers.length === 0) {
        for (let s = 1; s <= 7; s++) {
          servers.push({ id: String(s), name: "Server " + s });
        }
      }

      const eps = [];
      const epRe = /id=["']ep-(\d+)["'][^>]*(?:title=["']([^"']*)["'])?/gi;
      let em;
      while ((em = epRe.exec(htmlStr)) !== null) {
        eps.push({ id: em[1], title: em[2] || "Episode " + em[1] });
      }

      const modeMatch = htmlStr.match(/data-mode\s*=\s*["']([^"']+)/i);
      const dataMode = modeMatch ? modeMatch[1] : null;
      const isSeries =
        dataMode === "tv" ||
        eps.length > 1 ||
        /season/i.test(title) ||
        info.type === "series";

      let episodes = [];
      if (isSeries && eps.length > 0) {
        episodes = eps.map(function (ep) {
          return new MultimediaItem({
            title: ep.title,
            url: itemUrl(slug, mid, "series", {
              ep: ep.id,
              servers: servers,
              title: title,
              year: year,
            }),
            posterUrl: poster(slug),
            type: "episode",
          });
        });
      } else {
        episodes = [
          new MultimediaItem({
            title: title,
            url: itemUrl(slug, mid, "movie", {
              ep: "1",
              servers: servers,
              title: title,
              year: year,
            }),
            posterUrl: poster(slug),
            type: "movie",
          }),
        ];
      }

      cb({
        success: true,
        data: new MultimediaItem({
          title: title,
          url: url,
          posterUrl: poster(slug),
          bannerUrl: cover(slug),
          type: isSeries ? "series" : "movie",
          year: year,
          description: description,
          episodes: episodes,
        }),
      });
    } catch (e) {
      cb({
        success: false,
        errorCode: "LOAD_ERROR",
        message: String(e && e.message ? e.message : e),
      });
    }
  }

  // ---------- loadStreams ----------
  async function loadStreams(url, cb) {
    try {
      const info = parseUrl(url);
      let mid = info.mid;
      if (!mid && info.slug) {
        const m = String(info.slug).match(/-(\d+)$/);
        if (m) mid = m[1];
      }
      const ep = String(info.ep || "1");

      if (!mid) {
        return cb({
          success: false,
          errorCode: "NO_MID",
          message: "Movie id missing — open the title from search first",
        });
      }

      if (!getSubtle()) {
        return cb({
          success: false,
          errorCode: "NO_CRYPTO",
          message: "WebCrypto not available in this runtime",
        });
      }

      // Always try servers 1–7 (page server list may be incomplete)
      const serverIds = [];
      if (info.servers && info.servers.length) {
        for (let i = 0; i < info.servers.length; i++) {
          serverIds.push(String(info.servers[i].id || info.servers[i]));
        }
      }
      for (let s = 1; s <= 7; s++) {
        const id = String(s);
        if (serverIds.indexOf(id) === -1) serverIds.push(id);
      }

      const streams = [];
      const seen = {};
      const errors = [];

      for (let i = 0; i < serverIds.length; i++) {
        const sid = serverIds[i];
        try {
          const result = await tryNetodaServer(mid, ep, sid);
          if (result && result.url && !seen[result.url]) {
            seen[result.url] = true;
            streams.push(
              new StreamResult({
                url: result.url,
                quality: "HD",
                name: result.name || "Server " + sid,
                headers: result.headers || {
                  Referer: PLAYER + "/",
                  "User-Agent": UA,
                },
              })
            );
          }
        } catch (e) {
          errors.push("s" + sid + ":" + String(e && e.message ? e.message : e));
        }
      }

      if (streams.length === 0) {
        return cb({
          success: false,
          errorCode: "NO_STREAMS",
          message:
            "No streams (mid=" +
            mid +
            " ep=" +
            ep +
            "). " +
            (errors.length ? errors.slice(0, 3).join("; ") : "all servers empty"),
        });
      }

      cb({ success: true, data: streams });
    } catch (e) {
      cb({
        success: false,
        errorCode: "STREAM_ERROR",
        message: String(e && e.message ? e.message : e),
      });
    }
  }

  globalThis.getHome = getHome;
  globalThis.search = search;
  globalThis.load = load;
  globalThis.loadStreams = loadStreams;
})();
