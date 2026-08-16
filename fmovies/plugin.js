(function () {
  "use strict";

  const IMG_CDN = "https://img.cdno.my.id";
  const PLAYER = "https://netoda.tech";
  const UA =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
  const HEADERS = {
    "User-Agent": UA,
    Accept: "application/json, text/html, */*",
    "Accept-Language": "en-US,en;q=0.9",
  };

  // Embed hosts that take TMDB ids (fallback when direct HLS is unavailable)
  const EMBED_MOVIE = [
    "https://vidsrc.cc/v2/embed/movie/",
    "https://vidfast.pro/movie/",
    "https://vidlink.pro/movie/",
    "https://vidnest.fun/movie/",
    "https://player.videasy.net/movie/",
    "https://vsembed.ru/embed/movie/",
    "https://embos.top/movie/?mid=",
  ];
  const EMBED_TV = [
    "https://vidsrc.cc/v2/embed/tv/",
    "https://vidfast.pro/tv/",
    "https://vidlink.pro/tv/",
    "https://vidnest.fun/tv/",
    "https://player.videasy.net/tv/",
    "https://vsembed.ru/embed/tv/",
  ];

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

  // ---------- HTTP helpers (app fetch + CLI http_get) ----------
  async function httpJson(url, opt) {
    opt = opt || {};
    const headers = Object.assign({}, HEADERS, opt.headers || {});
    if (typeof fetch === "function") {
      const r = await fetch(url, {
        method: opt.method || "GET",
        headers: headers,
        body: opt.body,
      });
      if (!r.ok) throw new Error("HTTP " + r.status);
      return await r.json();
    }
    if (typeof http_get === "function" && (!opt.method || opt.method === "GET")) {
      const res = await http_get(url, headers);
      const body = res && res.body !== undefined ? res.body : res;
      return typeof body === "string" ? JSON.parse(body) : body;
    }
    throw new Error("No HTTP client available in runtime");
  }

  async function httpText(url, opt) {
    opt = opt || {};
    const headers = Object.assign({}, HEADERS, opt.headers || {});
    if (typeof fetch === "function") {
      const r = await fetch(url, {
        method: opt.method || "GET",
        headers: headers,
        body: opt.body,
      });
      if (!r.ok) throw new Error("HTTP " + r.status);
      return await r.text();
    }
    if (typeof http_get === "function" && (!opt.method || opt.method === "GET")) {
      const res = await http_get(url, headers);
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

  function getSubtle() {
    if (typeof crypto !== "undefined" && crypto.subtle) return crypto.subtle;
    if (typeof globalThis !== "undefined" && globalThis.crypto && globalThis.crypto.subtle)
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

  // FMovies watch-hash token (base64url of iv||ciphertext)
  async function buildWatchToken(mid, ep, server, country) {
    const subtle = getSubtle();
    if (!subtle) return null;
    const plain =
      String(mid) +
      "+" +
      String(ep) +
      "+" +
      String(server) +
      "+" +
      String(country) +
      "+" +
      Math.floor(Date.now() / 1000);
    const enc = new TextEncoder();
    const keyMaterial = await subtle.digest("SHA-256", enc.encode(country));
    const iv = getRandomValues(12);
    const key = await subtle.importKey(
      "raw",
      keyMaterial,
      { name: "AES-GCM" },
      false,
      ["encrypt"]
    );
    const cipher = await subtle.encrypt(
      { name: "AES-GCM", iv: iv },
      key,
      enc.encode(plain)
    );
    const ivStr = Array.from(iv)
      .map(function (b) {
        return String.fromCharCode(b);
      })
      .join("");
    const ctStr = Array.from(new Uint8Array(cipher))
      .map(function (b) {
        return String.fromCharCode(b);
      })
      .join("");
    // btoa of binary string
    let b64;
    if (typeof btoa === "function") {
      b64 = btoa(ivStr + ctStr);
    } else {
      const raw = new Uint8Array(iv.length + cipher.byteLength);
      raw.set(iv, 0);
      raw.set(new Uint8Array(cipher), iv.length);
      b64 = Buffer.from(raw).toString("base64");
    }
    return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  // Netoda /get/ path: salt(8)-iv(12)-ciphertext as hex
  async function buildGetPath(mid, ep, server, country) {
    const subtle = getSubtle();
    if (!subtle) return null;
    const plain =
      String(mid) +
      "+" +
      String(ep) +
      "+" +
      String(server) +
      "+" +
      String(country) +
      "+" +
      Math.floor(Date.now() / 1000);
    const enc = new TextEncoder();
    const keyMaterial = await subtle.digest("SHA-256", enc.encode(country));
    const salt = getRandomValues(8);
    const iv = getRandomValues(12);
    const key = await subtle.importKey(
      "raw",
      keyMaterial,
      { name: "AES-GCM" },
      false,
      ["encrypt"]
    );
    const cipher = await subtle.encrypt(
      { name: "AES-GCM", iv: iv },
      key,
      enc.encode(plain)
    );
    return (
      bytesToHex(salt) +
      "-" +
      bytesToHex(iv) +
      "-" +
      bytesToHex(new Uint8Array(cipher))
    );
  }

  async function getCountry() {
    try {
      const text = await httpText(PLAYER + "/cdn-cgi/trace");
      const m = text.match(/loc=([A-Z]{2})/);
      if (m) return m[1];
    } catch (e) {}
    try {
      const text = await httpText(base() + "/cdn-cgi/trace");
      const m = text.match(/loc=([A-Z]{2})/);
      if (m) return m[1];
    } catch (e) {}
    return "US";
  }

  // Resolve TMDB id from title (best-effort, no API key)
  async function resolveTmdbId(title, year) {
    if (!title) return null;
    try {
      const q = encodeURIComponent(String(title).replace(/\s+/g, " ").trim());
      // TMDB public search via themoviedb mirror-less: try vidsrc metadata API
      const meta = await httpJson(
        "https://data.vidsrcme.ru/api.php?type=movie&tmdb=0&q=" + q
      ).catch(function () {
        return null;
      });
      if (meta && meta.data && meta.data.tmdb_id) return String(meta.data.tmdb_id);

      // IMDb suggestion → not TMDB, skip
    } catch (e) {}
    return null;
  }

  async function tryNetodaDirect(mid, ep, server, country) {
    const path = await buildGetPath(mid, ep, server, country);
    if (!path) return null;
    try {
      const json = await httpJson(PLAYER + "/get/" + path, {
        headers: {
          Referer: PLAYER + "/watch/?v" + server + ep,
          "User-Agent": UA,
        },
      });
      if (!json || json.code !== 200 || !json.info) return null;
      if (json.mode === "direct") {
        return {
          url: PLAYER + "/hls/" + json.info + "/master.m3u8",
          mode: "direct",
          info: json.info,
        };
      }
      // embed mode: info is another encrypted blob; return mode for caller
      return { mode: "embed", info: json.info };
    } catch (e) {
      return null;
    }
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
      const yearMatch = htmlStr.match(
        /property=["']video:release_date["'][^>]+content=["'](\d{4})/i
      );
      if (yearMatch) year = Number(yearMatch[1]);
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
      const mid = info.mid;
      const ep = info.ep || "1";
      const servers =
        info.servers && info.servers.length
          ? info.servers
          : [1, 2, 3, 4, 5, 6, 7].map(function (n) {
              return { id: String(n), name: "Server " + n };
            });
      const isSeries = info.type === "series" || info.type === "tv";
      const title = info.title || info.slug || "";

      if (!mid) {
        return cb({
          success: false,
          errorCode: "NO_MID",
          message: "Movie id missing — open the title from search/home first",
        });
      }

      const country = await getCountry();
      const streams = [];
      const seen = {};

      function pushStream(s) {
        if (!s || !s.url || seen[s.url]) return;
        seen[s.url] = true;
        streams.push(s);
      }

      // 1) Netoda direct HLS via /get/
      for (let i = 0; i < servers.length; i++) {
        const srv = servers[i];
        const sid = String(srv.id || srv);
        const sname = srv.name || "Server " + sid;
        try {
          const result = await tryNetodaDirect(mid, ep, sid, country);
          if (result && result.mode === "direct" && result.url) {
            pushStream(
              new StreamResult({
                url: result.url,
                quality: "HD",
                name: sname + " (Direct)",
                headers: {
                  Referer: PLAYER + "/",
                  "User-Agent": UA,
                },
              })
            );
          }
        } catch (e) {
          /* try next server */
        }
      }

      // 2) Built-in extractors on known embed hosts (TMDB or mid)
      let tmdb = info.tmdb || null;
      if (!tmdb && title) {
        tmdb = await resolveTmdbId(title, info.year);
      }
      const idForEmbed = tmdb || mid;

      if (typeof loadExtractor === "function" && idForEmbed) {
        const embeds = isSeries ? EMBED_TV : EMBED_MOVIE;
        for (let i = 0; i < embeds.length; i++) {
          let embedUrl = embeds[i] + idForEmbed;
          if (isSeries && embeds[i].indexOf("vid") !== -1) {
            // common pattern: /tv/{id}/{season}/{episode}
            const season = info.season || "1";
            if (embeds[i].indexOf("vidsrc") !== -1 || embeds[i].indexOf("vidfast") !== -1) {
              embedUrl = embeds[i] + idForEmbed + "/" + season + "/" + ep;
            }
          }
          if (embeds[i].indexOf("mid=") !== -1) {
            embedUrl = embeds[i] + idForEmbed;
          }
          try {
            const extracted = await loadExtractor(embedUrl);
            if (Array.isArray(extracted)) {
              for (let j = 0; j < extracted.length; j++) {
                pushStream(extracted[j]);
              }
            }
          } catch (e) {
            /* extractor not available for host */
          }
        }
      }

      // Do NOT return netoda /watch/ HTML pages — they hang forever in the player.
      if (streams.length === 0) {
        return cb({
          success: false,
          errorCode: "NO_STREAMS",
          message:
            "No direct HLS yet (Netoda /get/ token mismatch). Search/browse works; playback needs a token fix.",
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
