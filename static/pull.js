import * as http from "node:http";
import * as fs from "node:fs/promises";
import * as path from "node:path";

const baseChars = JSON.parse((await fs.readFile("src/lib/base-official.json", { encoding: "utf-8"})));

for (let char of baseChars) {
    fetch("https://script.bloodontheclocktower.com" + char.icon.slice(1)).then(async function(resp) {
//        console.log("https://script.bloodontheclocktower.com" + char.icon.slice(1));
            const dirname = path.dirname(char.icon.slice(1));
        await fs.mkdir("static/base/" + dirname, {recursive: true});
        await fs.writeFile("static/base/" + char.icon.slice(1), new DataView(await resp.arrayBuffer()));
    })
}

const anthChars = JSON.parse((await fs.readFile("src/lib/anth.json", { encoding : "utf-8" })));
for (let char of anthChars) {
    if (char.id == "_meta") {
        continue;
    }

    fetch(char.image[0]).then(async function(resp) {
        await fs.writeFile("static/anth/" + char.id + ".png", new DataView(await resp.arrayBuffer()));
    })
}
