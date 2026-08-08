const URL = "fmoviess.org";
const PCL = "https://";
const DIR = "/home/";

function getActiveUrl() {
    const runtimeOverride = app.getPreference("custom_domain_url");
    const domain = (runtimeOverride && runtimeOverride.trim() !== "") ? runtimeOverride.trim() : URL;
    return `${PCL}${domain}`;
}

async function getHome() {
    const rootUrl = getActiveUrl();
    const response = await http.get(`${rootUrl}${DIR}`);
    const html = response.body;
    
    const items = html.select(".movie-layout").map(element => ({
        title: element.select("h2").text().trim(),
        url: `${rootUrl}${element.select("a").attr("href")}`,
        poster: element.select("img").attr("src"),
        quality: element.select(".HD, .CAM").text().trim() || "HD"
    }));
    
    return [{ title: "Latest Movies", layout: "grid", items: items }];
}

async function search(query) {
    const rootUrl = getActiveUrl();
    const searchUrl = `${rootUrl}${DIR}search/${encodeURIComponent(query)}`;
    const response = await http.get(searchUrl);
    const html = response.body;

    return html.select(".movie-layout").map(element => ({
        title: element.select("h2").text().trim(),
        url: `${rootUrl}${element.select("a").attr("href")}`,
        poster: element.select("img").attr("src")
    }));
}

async function loadLinks(mediaPageUrl) {
    const response = await http.get(mediaPageUrl);
    const html = response.body;
    let streamLinks = [];
    
    const playerFrames = html.select("iframe, .player-iframe, #iframe-embed");
    playerFrames.forEach(frame => {
        let frameSrc = frame.attr("src");
        if (frameSrc) {
            if (frameSrc.startsWith("//")) frameSrc = `${PCL}${frameSrc.substring(2)}`;
            streamLinks.push({
                name: "Primary Streaming Gateway",
                url: frameSrc,
                type: "embed",
                isM3u8: false
            });
        }
    });
    
    return streamLinks;
}
