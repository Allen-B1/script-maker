self.addEventListener("install", (event) => {
    console.log("installed");
});

self.addEventListener("fetch", (event) => {
    console.log("fetch event");
    if (event.request.url.startsWith("https://script.bloodontheclocktower.com") || event.request.url.startsWith("https://www.bloodstar.xyz") || (event.request.url.contains("/anth/") && event.request.url.endsWith(".png"))) {
        let f = (async () => {
            let resp = await caches.match(event.request);
            if (!resp) {
                let [cache, resp] = await Promise.all([caches.open("v1"), fetch(event.request.url)]);
                if (!resp.ok) {
                    throw new TypeError("bad response status");
                }
                cache.put(event.request, resp.clone());
                return resp.clone();
            }
            return resp.clone();
        });
        let promise = f();
        if (!(promise instanceof Promise)) {
            throw new Error("not promise");
        }
        event.respondWith(promise);
    }
});