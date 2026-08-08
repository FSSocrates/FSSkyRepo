const URL = "fmoviess.org";
const PCL = "https:";
const DIR = "/home/";

function getActiveUrl() {
    const runtimeOverride = app.getPreference("custom_domain_url");
    return (runtimeOverride && runtimeOverride.trim() !== "") ? runtimeOverride.trim() : URL;
}

async function getHome() {
    const domain = `${PCL}//${getActiveUrl()}`;
    const response = await http.get(`${domain}${DIR}`);
    const html = response.body;
    
    const items = html.select(".movie-layout").map(element => {
        let href = element.select("a").attr("href") || "";
        let src = element.select("img").attr("src") || "";

        const url = href.startsWith("http") ? href : (href.startsWith("//") ? `${PCL}${href}` : `${domain}${href.startsWith("/") ? "" : "/"}${href}`);
        const poster = src.startsWith("http") ? src : (src.startsWith("//") ? `${PCL}${src}` : `${domain}${src.startsWith("/") ? "" : "/"}${src}`);

        return {
            title: element.select("h2").text().trim(),
            url: url,
            poster: poster,
            quality: element.select(".HD, .CAM").text().trim() || "HD"
        };
    });

    return [{ title: "Latest Movies", layout: "grid", items: items }];
}

async function search(query) {
    const domain = `${PCL}//${getActiveUrl()}`;
    const searchUrl = `${domain}${DIR}search/${encodeURIComponent(query)}`;
    const response = await http.get(searchUrl);
    const html = response.body;

    return html.select(".movie-layout").map(element => {
        let href = element.select("a").attr("href") || "";
        let src = element.select("img").attr("src") || "";

        const url = href.startsWith("http") ? href : (href.startsWith("//") ? `${PCL}${href}` : `${domain}${href.startsWith("/") ? "" : "/"}${href}`);
        const poster = src.startsWith("http") ? src : (src.startsWith("//") ? `${PCL}${src}` : `${domain}${src.startsWith("/") ? "" : "/"}${src}`);

        return {
            title: element.select("h2").text().trim(),
            url: url,
            poster: poster
        };
    });
}

async function loadLinks(mediaPageUrl) {
    const domain = `${PCL}//${getActiveUrl()}`;
    const response = await http.get(mediaPageUrl);
    const html = response.body;
    let streamLinks = [];

    const playerFrames = html.select("iframe, .player-iframe, #iframe-embed");
    playerFrames.forEach(frame => {
        let frameSrc = frame.attr("src");
        if (frameSrc) {
            let streamUrl = frameSrc.startsWith("http") 
                ? frameSrc 
                : (frameSrc.startsWith("//") 
                    ? `${PCL}${frameSrc}` 
                    : `${domain}${frameSrc.startsWith("/") ? "" : "/"}${frameSrc}`);

            streamLinks.push({
                name: "Primary Streaming Gateway",
                url: streamUrl,
                type: "embed",
                isM3u8: false
            });
        }
    });

    return streamLinks;
}
