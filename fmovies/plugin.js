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

  function itemUrl(slug, mid, type) {
    return JSON.stringify({
      slug: slug,
      mid: mid || null,
      type: type || "movie",
    });
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
    const midMatch = slug.match(/-(\d+)$/);
    const mid = midMatch ? midMatch[1] : null;

    return new MultimediaItem({
      title: title,
      url: itemUrl(slug, mid, isSeries ? "series" : "movie"),
      posterUrl: poster(slug),
      type: isSeries ? "series" : "movie",
      year: row.y ? Number(row.y) : undefined,
      description: row.q ? "Quality: " + row.q : "",
    });
  }

  // Works in both app (fetch) and CLI (http_get)
  async function httpJson(url) {
    if (typeof fetch === "function") {
      const r = await fetch(url, { headers: HEADERS });
      if (!r.ok) throw new Error("HTTP " + r.status);
      return await r.json();
    }
    if (typeof http_get === "function") {
      const res = await http_get(url, HEADERS);
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

  // ---------- getHome ----------
  async function getHome(cb) {
    try {
      const data = await httpJson(base() + "/index.json");
      const list = Array.isArray(data) ? data : [];

      const latest = [];
      const series = [];
      const movies = [];

      for (let i = 0; i < list.length && latest.length < 40; i++) {
        const item = toItem(list[i]);
        if (!item) continue;
        latest.push(item);
        if (item.type === "series" && series.length < 24) series.push(item);
        if (item.type === "movie" && movies.length < 24) movies.push(item);
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
      const q = encodeURIComponent(String(query || "").trim());
      if (!q) return cb({ success: true, data: [] });

      let rows = [];
      try {
        const json = await httpJson(
          base() + "/searching?q=" + q + "&limit=40&offset=0"
        );
        rows = (json && json.data) || [];
      } catch (e) {
        const all = await httpJson(base() + "/index.json");
        const needle = String(query).toLowerCase();
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
          errorCode: "BAD_URL",
          message: "Missing slug",
        });
      }

      const htmlStr = await httpText(base() + "/film/" + slug + "/");

      let title = slug.replace(/-\d+$/, "").replace(/-/g, " ");
      const titleMatch = htmlStr.match(/<title[^>]*>([^<]+)/i);
      if (titleMatch) {
        title = titleMatch[1]
          .replace(/Watch\s+/i, "")
          .replace(/\s+Full Movie.*/i, "")
          .replace(/\s+on Fmovies.*/i, "")
          .trim();
      }

      let mid = info.mid;
      const midMatch = htmlStr.match(/data-mid\s*=\s*["']?(\d+)/i);
      if (midMatch) mid = midMatch[1];
      if (!mid) {
        const m = slug.match(/-(\d+)$/);
        if (m) mid = m[1];
      }

      let description = "";
      const descMatch = htmlStr.match(
        /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)/i
      );
      if (descMatch) description = descMatch[1];

      let year;
      const yearMatch = htmlStr.match(/\b(19|20)\d{2}\b/);
      if (yearMatch) year = Number(yearMatch[0]);

      const servers = [];
      const srvRe = /id=["']srv-(\d+)["'][^>]*>([^<]*)</gi;
      let sm;
      while ((sm = srvRe.exec(htmlStr)) !== null) {
        servers.push({
          id: sm[1],
          name: (sm[2] || "Server " + sm[1]).trim(),
        });
      }
      if (servers.length === 0) servers.push({ id: "1", name: "Server 1" });

      const eps = [];
      const epRe = /id=["']ep-(\d+)["'][^>]*(?:title=["']([^"']*)["'])?/gi;
      let em;
      while ((em = epRe.exec(htmlStr)) !== null) {
        eps.push({ id: em[1], title: em[2] || "Episode " + em[1] });
      }

      const isSeries =
        eps.length > 1 || /season/i.test(title) || info.type === "series";

      let episodes = [];
      if (isSeries && eps.length > 0) {
        episodes = eps.map(function (ep) {
          return new MultimediaItem({
            title: ep.title,
            url: JSON.stringify({
              slug: slug,
              mid: mid,
              type: "series",
              ep: ep.id,
              servers: servers,
            }),
            posterUrl: poster(slug),
            type: "episode",
          });
        });
      } else {
        episodes = [
          new MultimediaItem({
            title: title,
            url: JSON.stringify({
              slug: slug,
              mid: mid,
              type: "movie",
              ep: "1",
              servers: servers,
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

  // ---------- stream token ----------
  async function buildToken(mid, ep, server, country) {
    if (typeof crypto === "undefined" || !crypto.subtle) return "";

    const plain =
      mid +
      "+" +
      ep +
      "+" +
      server +
      "+" +
      country +
      "+" +
      Math.floor(Date.now() / 1000);
    const enc = new TextEncoder();

    const keyMaterial = await crypto.subtle.digest(
      "SHA-256",
      enc.encode(country)
    );
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await crypto.subtle.importKey(
      "raw",
      keyMaterial,
      { name: "AES-GCM" },
      false,
      ["encrypt"]
    );
    const cipher = await crypto.subtle.encrypt(
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

    const raw = btoa(ivStr + ctStr);
    return raw.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  async function getCountry() {
    try {
      const text = await httpText(base() + "/cdn-cgi/trace");
      const m = text.match(/loc=([A-Z]{2})/);
      return m ? m[1] : "US";
    } catch (e) {
      return "US";
    }
  }

  // ---------- loadStreams ----------
  async function loadStreams(url, cb) {
    try {
      const info = parseUrl(url);
      const mid = info.mid;
      const ep = info.ep || "1";
      const servers = info.servers || [{ id: "1", name: "Server 1" }];

      if (!mid) {
        return cb({
          success: false,
          errorCode: "NO_MID",
          message: "Movie id missing — open the title from search/home first",
        });
      }

      const country = await getCountry();
      const streams = [];

      for (let i = 0; i < servers.length; i++) {
        const srv = servers[i];
        try {
          const token = await buildToken(mid, ep, srv.id, country);
          const watchUrl =
            PLAYER +
            "/watch/?v" +
            srv.id +
            ep +
            (token ? "#" + token : "");

          streams.push(
            new StreamResult({
              url: watchUrl,
              quality: "HD",
              name: srv.name || "Server " + srv.id,
              headers: {
                Referer: base() + "/",
                "User-Agent": UA,
              },
            })
          );
        } catch (e) {
          /* skip server */
        }
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
