const DEFAULT_URL = "fmoviess.org/home";

function getActiveUrl() {
    const runtimeOverride = app.getPreference("custom_domain_url");
    let rawUrl = (runtimeOverride && runtimeOverride.trim() !== "") ? runtimeOverride.trim() : DEFAULT_URL;
    
    return `https://${rawUrl}/`;
}

async function getHome() {
    const targetEndpoint = getActiveUrl(); 
    const response = await http.get(targetEndpoint);
    const html = response.body;
    
    const items = html.select(".movie-layout").map(element => {
        return {
            title: element.select("h2").text().trim(),
            url: element.select("a").attr("href"),
            poster: element.select("img").attr("src"),
            quality: element.select(".HD, .CAM").text().trim() || "HD"
        };
    });
    
    return [{ title: "Latest Movies", layout: "grid", items: items }];
}

async function search(query) {
    const targetEndpoint = getActiveUrl();
    const searchUrl = `${targetEndpoint}search/${encodeURIComponent(query)}`;
    const response = await http.get(searchUrl);
    const html = response.body;

    return html.select(".movie-layout").map(element => ({
        title: element.select("h2").text().trim(),
        url: element.select("a").attr("href"),
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
            if (frameSrc.startsWith("//")) frameSrc = "https:" + frameSrc;
            streamLinks.push({
                name: "Primary Streaming Gateway",
                url: frameSrc,
                type: "embed",
                isM3u8: false
            });
        }
    });
    
    if (streamLinks.length === 0) {
        const scriptTags = html.select("script").text();
        const urlRegex = /(https?:\/\/[^\s'"]+vidsrc[^\s'"]+)/g;
        const matches = scriptTags.match(urlRegex);
        if (matches) {
            matches.forEach(match => {
                streamLinks.push({
                    name: "Alternative Backup Gateway",
                    url: match,
                    type: "embed",
                    isM3u8: false
                });
            });
        }
    }
    
    return streamLinks;
}
