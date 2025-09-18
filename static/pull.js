import * as http from "node:http";
import * as fs from "node:fs/promises";
import * as path from "node:path";

const baseChars = JSON.parse((await fs.readFile("src/lib/base-official.json", { encoding: "utf-8"})));

let i = 0;
for (let char of baseChars) {
    let j = ++i;
    fetch("https://script.bloodontheclocktower.com" + char.icon.slice(1)).then(async function(resp) {
        console.log(j + " / " + baseChars.length);
//        console.log("https://script.bloodontheclocktower.com" + char.icon.slice(1));
            const dirname = path.dirname(char.icon.slice(1));
        await fs.mkdir("static/base/" + dirname, {recursive: true});
        await fs.writeFile("static/base/" + char.icon.slice(1), new DataView(await resp.arrayBuffer()));
    })
}