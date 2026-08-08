(function () {
    const DIR = "/home/";

    function toUrl(path, domain) {
        if (!path) return "";
        if (path.startsWith("http")) return path;
        if (path.startsWith("//")) return `https:${path}`;
        return `${domain}${path.startsWith("/") ? "" : "/"}${path}`;
    }

    async function getHome(cb) {
        try {
            const domain = manifest.baseUrl;
            const response = await http.get(`${domain}${DIR}`);

            const items = response.body.select(".movie-layout").map(el => new MultimediaItem({
                title: el.select("h2").text().trim(),
                url: toUrl(el.select("a").attr("href"), domain),
                posterUrl: toUrl(el.select("img").attr("src"), domain),
                type: "movie"
            }));

            cb({
                success: true,
                data: {
                    "Latest Movies": items
                }
            });
        } catch (err) {
            cb({ success: false, message: err.message });
        }
    }

    async function search(query, cb) {
        try {
            const domain = manifest.baseUrl;
            const response = await http.get(`${domain}${DIR}search/${encodeURIComponent(query)}`);

            const results = response.body.select(".movie-layout").map(el => new MultimediaItem({
                title: el.select("h2").text().trim(),
                url: toUrl(el.select("a").attr("href"), domain),
                posterUrl: toUrl(el.select("img").attr("src"), domain),
                type: "movie"
            }));

            cb({ success: true, data: results });
        } catch (err) {
            cb({ success: false, message: err.message });
        }
    }

    async function load(url, cb) {
        try {
            cb({
                success: true,
                data: new MultimediaItem({
                    title: "Movie Details",
                    url: url,
                    posterUrl: "",
                    type: "movie"
                })
            });
        } catch (err) {
            cb({ success: false, message: err.message });
        }
    }

    async function loadStreams(url, cb) {
        try {
            const domain = manifest.baseUrl;
            const response = await http.get(url);

            const streams = response.body.select("iframe, .player-iframe, #iframe-embed")
                .map(frame => frame.attr("src"))
                .filter(Boolean)
                .map(src => new StreamResult({
                    url: toUrl(src, domain),
                    quality: "1080p"
                }));

            cb({ success: true, data: streams });
        } catch (err) {
            cb({ success: false, message: err.message });
        }
    }

    globalThis.getHome = getHome;
    globalThis.search = search;
    globalThis.load = load;
    globalThis.loadStreams = loadStreams;
})();
