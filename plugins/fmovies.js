const URL = "fmoviess.org";
const PCL = "https:";
const DIR = "/home/";

function getActiveUrl() {
    const override = app.getPreference("custom_domain_url");
    const domain = (override && override.trim() !== "") ? override.trim() : URL;
    return `${PCL}//${domain}`;
}

function toUrl(path, domain) {
    if (!path) return "";
    if (path.startsWith("http")) return path;
    if (path.startsWith("//")) return `${PCL}${path}`;
    return `${domain}${path.startsWith("/") ? "" : "/"}${path}`;
}

async function getHome() {
    const domain = getActiveUrl();
    const response = await http.get(`${domain}${DIR}`);
    
    const items = response.body.select(".movie-layout").map(el => ({
        title: el.select("h2").text().trim(),
        url: toUrl(el.select("a").attr("href"), domain),
        poster: toUrl(el.select("img").attr("src"), domain),
        quality: el.select(".HD, .CAM").text().trim() || "HD"
    }));

    return [{ title: "Latest Movies", layout: "grid", items }];
}

async function search(query) {
    const domain = getActiveUrl();
    const response = await http.get(`${domain}${DIR}search/${encodeURIComponent(query)}`);

    return response.body.select(".movie-layout").map(el => ({
        title: el.select("h2").text().trim(),
        url: toUrl(el.select("a").attr("href"), domain),
        poster: toUrl(el.select("img").attr("src"), domain)
    }));
}

async function loadLinks(mediaPageUrl) {
    const domain = getActiveUrl();
    const response = await http.get(mediaPageUrl);

    return response.body.select("iframe, .player-iframe, #iframe-embed")
        .map(frame => frame.attr("src"))
        .filter(Boolean)
        .map(src => ({
            name: "Primary Streaming Gateway",
            url: toUrl(src, domain),
            type: "embed",
            isM3u8: false
        }));
}
