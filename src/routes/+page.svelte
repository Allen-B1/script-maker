
<script lang="ts">
    import anthRoles from '$lib/anth.json';
    import pattersRoles from '$lib/base-patters.json';
    import officialRoles from '$lib/base-official.json';
    import baseJinxes from '$lib/base-jinx.json';
    import { onMount } from 'svelte';

    type CharType = "townsfolk" | "outsider" | "minion" | "demon" | "traveler" | "fabled";

    type Role = { id: string, name: string, edition: string, type: CharType, ability: string, firstNight?: number, otherNight?: number, image: string };

    const BASE_EDITIONS = new Set(["tb", "snv", "bmr", "exp"]);
    function isHomebrew(role: Role): boolean {
        return !BASE_EDITIONS.has(role.edition);
    }

    function transformBaseRoleId(name: string): string {
        return name.toLowerCase().replace(/\s+/g, "_").replace(/[^A-Za-z0-9_\-]/g, "");
    }

    const officialRolesRecord = ((a) => {
        let d = {};
        for (let role of a) {
            d[transformBaseRoleId(role.id)] = role;
        }
        return d;
    })(officialRoles);

    const anthRoleRecord = {};
    for (let role of anthRoles) {
        anthRoleRecord[role.id] = role;
    }

    let roles: Role[] = [];
    for (let role of pattersRoles.data) {
        let id = transformBaseRoleId(role.name);
        if (!officialRolesRecord[id]) continue;
        roles.push({
            id: id,
            name: role.name,
            edition: role.edition || "exp",
            type: role.type,

            ability: role.ability,
            firstNight: role.firstNight,
            otherNight: role.otherNight,
            image: "https://script.bloodontheclocktower.com" + officialRolesRecord[id].icon.slice(1)
        });
    }
    for (let role of anthRoles) {
        let raw_role_id = role.id.slice(0, -"_the_bootleggers_anthology".length);
        roles.push({
            id: role.id,
            name: role.name,
            edition: "anth",
            type: role.team,

            ability: role.ability,
            firstNight: role.firstNight,
            otehrNight: role.otherNight,
            image: "/anth/" + raw_role_id + ".png"
        });
        console.log(roles[roles.length-1]);
    }

    const rolesRecord: Record<string, Role> = {};
    for (let role of roles) {
        rolesRecord[role.id] = role;
    }

    const jinxes: Record<string, Record<string, string>> = {};
    for (let role of baseJinxes) {
        let roleId = transformBaseRoleId(role.id);
        for (let jinx of role.jinx) {
            let jinxId = transformBaseRoleId(jinx.id);
            jinxes[roleId] = jinxes[roleId] || {};
            jinxes[roleId][jinxId] = jinx.reason;
        }
    }
    for (let role of anthRoles) {
        if (!role.jinxes) continue;
        for (let jinx of role.jinxes) {
            let jinxRole = pattersRoles.data.find(x => x.id == jinx.id);
            let jinxId = jinxRole ? transformBaseRoleId(jinxRole.name) : jinx.id;
            jinxes[role.id] = jinxes[role.id] || {};
            jinxes[role.id][jinxId] = jinx.reason;
        }
    }
    
    // -- end init --

    const filter = {
        tb: false,
        snv: false,
        bmr: false,
        exp: false,
        anth: true,

        name: "",

        type: "all"
    };
    
    let meta = {
        name: "",
        author: "",
    };
    onMount(() => {
        meta = JSON.parse(localStorage.getItem("meta") || "null") || meta;
    })
    $: if (typeof localStorage !== "undefined" && (meta.name != "" || meta.author != "")) {
        localStorage.setItem("meta", JSON.stringify(meta));
    }

    function applyFilter(role, filter) {
        return (filter.tb || role.edition != "tb") &&
            (filter.bmr || role.edition != "bmr") &&
            (filter.snv || role.edition != "snv") &&
            (filter.exp || role.edition != "exp") &&
            (filter.anth || role.edition != "anth") &&
            (filter.name == "" || role.name.toLowerCase().indexOf(filter.name.toLowerCase()) !== -1) &&
            (filter.type == role.type || filter.type == "all");
    };

    let script = [];
    onMount(() => {
        script = JSON.parse(localStorage.getItem("script") || "[]");
    });
    $: if (typeof localStorage != "undefined" && script.length != 0) {
        localStorage.setItem("script", JSON.stringify(script));
    }


    function toggleRole(role) {
        let i = script.findIndex(r => r.id === role.id);
        if (i === -1) {
            script.push(role);
            normalizeScript(script);
        } else {
            script.splice(i, 1);
        }
        script = script;
    }

    function calculateLetterSpacing(text: string, target: number): string {
        const canvas: HTMLCanvasElement = calculateLetterSpacing.canvas || (calculateLetterSpacing.canvas = document.createElement("canvas"));
        const context = canvas.getContext("2d");
        context.font = "1.5vh 'Times New Roman', Times, serif";
        const metrics = context.measureText(text);
        const width = metrics.width;

        let viewHeight = window.innerHeight;

        let widthInVH = width / viewHeight * 100;
        if (widthInVH > target) {
            const spacing = (widthInVH - target) / text.length;
            return "-" + spacing + "vh";
        }
        return 'normal';
    }

    /** Orders script from TF, Outsider, Minion, Demon */
    function normalizeScript(script) {
        script.sort((a, b) => {
            const types = { "townsfolk": 0, "outsider": 1, "minion": 2, "demon": 3, "traveler": 4, "fabled": 5 };
            return types[a.type] - types[b.type];
        });
    }
    function onScriptDrop(ev: DragEvent, target: number) {
        ev.preventDefault();
        let idx = ev.dataTransfer?.getData("application/x.index")|0;
        let role = script[idx];
        script.splice(idx, 1);
        script.splice(target, 0, role);
        normalizeScript(script);
        script = script;
    }

    function exportScript() {
        let json = [{
            id: "_meta",
            name: meta.name,
            author: meta.author
        }];
        for (let role of script) {
            if (!isHomebrew(role)) {
                json.push({id: role.id});
            } else {
                json.push(anthRoleRecord[role.id]);
            }
        }

        let a = document.createElement("a");
        let blob = new Blob([JSON.stringify(json)], {type:"application/json"});
        a.href = URL.createObjectURL(blob);
        a.download = meta.name + ".json";
        a.click();
    }

    let fileInput: HTMLInputElement;
    function importScript() {
        let file = fileInput.files[0];
        file.text().then(function(text) {
            let json = JSON.parse(text);
            let script_ = [];
            for (let role of json) {
                if (typeof role == "string") {
                    role = {id: role};
                }
                if (role.id == "_meta") {
                    meta.name = role.name;
                    meta.author = role.author;
                    continue;
                }
                if (!(role.id in rolesRecord)) {
                    continue;
                }
                script_.push(rolesRecord[role.id]);
            }
            script = script_;
        });
    }

    function sortScript() {
        script.sort((a, b) => {
            let categoryOf = (ability, id) => 
                id == "mezepheles" ? 7 :
                ability.startsWith("You start knowing") ? 0 :
                ability.startsWith("Each night*") ? 2 : 
                ability.startsWith("Each night") ? 1 :
                ability.startsWith("Each day") ? 3 :
                ability.startsWith("Once per game, at night*") ? 5 :
                ability.startsWith("Once per game, at night") ? 4 :
                ability.startsWith("Once per game, during the day") ? 6 : 7;

            let catA = categoryOf(a.ability), catB = categoryOf(b.ability);
            if (catA != catB) return catA - catB;
            
            return b.ability.length -  a.ability.length;
        });
        script = script;
    }

    // service worker for caching images
    onMount(() => {
        if ("serviceWorker" in navigator) {
            (async () => {
                let registration = await navigator.serviceWorker.register("/sw.js", {
                    scope: "/",
                });
                console.log(registration.installing, registration.waiting, registration.active);
            })();

            navigator.serviceWorker.onmessage = function (event) {
                console.log(event.data);
            };
        }
    });
</script>

<style>
:global(body) {
    margin: 0; padding: 0;
}
main {
    display: flex;
    flex-direction: row;
    font-family: "Helvetica Neue",Helvetica,Arial,sans-serif;

    height: 100vh;
    align-items: stretch;
}
.script-panel {
    flex-grow: 1;
    background: #ddd;
}
.export-panel {
    background: #111;
    width: 192px;
}
.roles-panel {
    background: #111;
    color:#fff;
    padding: 16px;

    width: 256px;

    display: flex;
    flex-direction: column;
}
.filter {
    display: flex;
    flex-direction: column;
}
.filter-type {
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-rows: auto auto;
}
.filter-type > :last-child {
    grid-row: 1 / span 2;
    grid-column: 2;
}
.categories {
    overflow: auto;
    flex-grow: 1;
    flex-shrink: 1;
    flex-basis: 0;
    margin-top: 16px;
}

.category-name {
    font-size: 16px;
    margin: 0;
    margin-bottom: 8px;
}

.category-list {
    background: #fff;
    color: #444;

    font-weight: bold;
    font-size: 14px;
    margin-bottom: 16px;
}

.character {
    display: flex;
    flex-direction: row;
    align-items: center;

    padding: 2px 8px;
    min-height: 32px;
}
.character.active {
    background: hsl(200, 50%, 85%); }
.character img {
    width: 32px; }
.character img.anth {
    width: 24px;
    padding: 0 4px; }

.script {
    width: 77vh;
    height: 100vh;
    background: #fff;
    margin: auto;

    position: relative;
}
.script-name {
    position: absolute;
    top: 0.7vh;
    left: 1.5vh;

    font-family:'Times New Roman', Times, serif;
    font-size: 2.25vh;
    background: #fff;
    z-index: 3;
}
.script-role {
    font-family:'Times New Roman', Times, serif;
    font-size: 1.5vh;

    padding-left: 1.5vh;
    position: relative;
    background: inherit;
    height: 3.5vh;

    display: flex;
    flex-direction: row;
    align-items: center;

    cursor: default;
}
.script-role > img {
    width: 4vh;
    margin-right: 0.5vh;

    cursor: pointer;
}
.script-role > img.anth {
    width: 3vh;
    padding: 0 0.5vh;
}
.script-role > img.homebrew:not(.anth) {
    margin-top: 0.5vh;
}
.script-role-name {
    width: 8vh;
    display: inline-block;
}

.script-role-jinxes {
    position: absolute;
    display: flex;
    flex-direction: row;
    align-items: center;

    bottom: -0.375vh;
    left: 6vh;
    z-index: 1;
}
.script-role-jinxes img {
    width: 2vh;
    margin-right: -0.1vh;
}
.script-role-jinxes img.anth {
    width: 1.5vh;
}

.script-type-divider {
    position: relative;
    height: 0.25vh;
    background: #777;
    margin: 1vh 0;
    z-index: 2;
}
.script-type-divider span {
    position: absolute;
    right: 2vh;
    top: -1vh;
    height: 2vh;
    display: inline-block;
    font-family: 'Times New Roman', Times, serif;
    font-size: 1.5vh;
    background: #fff;
    padding: 0 1vh;
    border: 0.25vh solid #777;
    border-radius: 1vh;
    text-transform: uppercase;
}
.script footer {
    font-family: 'Times New Roman', Times, serif;
    font-size: 1.25vh;
    position: absolute;
    bottom: 1vh;
    left: 1.5vh;
    right: 1.5vh;

    display: flex;
    flex-direction: row;
    gap: 1vh;
}
.script footer > :first-child {
    flex-grow: 1;
}

.characters-footer {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    padding: 0 1.5vh;

    position: absolute;
    bottom: 2.75vh;
    left: 0;
    right: 0;
}
.characters-footer img {
    width: 3vh;
}

.export-panel {
    display: flex;
    flex-direction: column;
    padding: 16px;
    align-self: stretch;
}
.export-panel fieldset {
    margin-bottom: 32px;
}
.export-panel input[type=text] {
    align-self: stretch;
}
.export-panel footer {
    color: #fff;
}
.export-panel footer > * {
    margin: 0;
    margin-top: 8px;
}

@media print {
    .roles-panel { display: none; }
    .export-panel { display: none; }
}

fieldset {
    padding: 0;
    border: 0;
    margin-top: 16px;
}
input[type=text] {
    border: 0;
    background: #fff;
    padding: 8px 16px;
    display: block;
}
button {
    border: 0;
    background: hsl(220, 70%, 50%);
    color: #fff;
    padding: 8px 16px;
    cursor: pointer;
}
.red {
    background: hsl(0, 70%, 50%);
}
.gray { background: hsl(220, 5%, 50%); }
</style>

<svelte:head>
    <title>Unofficial Homebrew Script Tool</title>
</svelte:head>
<main>
    <div class="roles-panel">
        <div class="filter">
            <input type="text" placeholder="Filter by name..." bind:value={filter.name} style={"align-self:stretch"} />
            <fieldset>
                Filter by edition:
                <div><input type="checkbox" id="filter-tb" bind:checked={filter.tb}> <label for="filter-tb">Trouble Brewing</label></div>
                <div><input type="checkbox" id="filter-bmr" bind:checked={filter.bmr}> <label for="filter-bmr">Bad Moon Rising</label></div>
                <div><input type="checkbox" id="filter-snv" bind:checked={filter.snv}> <label for="filter-snv">Sects and Violets</label></div>
                <div><input type="checkbox" id="filter-exp" bind:checked={filter.exp}> <label for="filter-exp">Experimental</label></div>
                <div><input type="checkbox" id="filter-anth" bind:checked={filter.anth}> <label for="filter-anth">Bootlegger's Anthology</label></div>
            </fieldset>

            <fieldset class="filter-type">
                Filter by type:
                <div>
                    <div><input type="radio" name="filter-type" id="filter-alltypes" value="all" bind:group={filter.type} /> <label for="filter-alltypes">All</label></div>
                    <div><input type="radio" name="filter-type" id="filter-traveler" value="traveler" bind:group={filter.type} /> <label for="filter-traveler">Traveller</label></div>
                    <div><input type="radio" name="filter-type" id="filter-fabled" value="fabled" bind:group={filter.type} /> <label for="filter-fabled">Fabled</label></div>
                </div>
                <div>
                    <div><input type="radio" name="filter-type" id="filter-townsfolk" value="townsfolk" bind:group={filter.type} /> <label for="filter-townsfolk">Townsfolk</label></div>
                    <div><input type="radio" name="filter-type" id="filter-outsider" value="outsider" bind:group={filter.type} /> <label for="filter-outsider">Outsider</label></div>
                    <div><input type="radio" name="filter-type" id="filter-minion" value="minion" bind:group={filter.type} /> <label for="filter-minion">Minion</label></div>
                    <div><input type="radio" name="filter-type" id="filter-demon" value="demon" bind:group={filter.type} /> <label for="filter-demon">Demon</label></div>
                </div>
            </fieldset>
        </div>
        <div class="categories">
            {#each ["townsfolk", "outsider", "minion", "demon", "traveler", "fabled"] as chartype}
            <div class="category">
                <div class="category-name">{chartype[0].toUpperCase() + chartype.slice(1)}</div>
                <div class="category-list">
                    {#each roles as role}
                    {#if role.type == chartype && applyFilter(role, filter)}
                    <div class="character"
                        class:active={!!script.find(r => r.id === role.id)}
                        on:click={() => toggleRole(role)}
                        title={role.ability}>
                        <img src={role.image} class:anth={role.edition == "anth"}>
                        <span class="character-name">{role.name}</span>
                    </div>
                    {/if}
                    {/each}
                </div>
            </div>
            {/each}
        </div>
    </div>

    <div class="script-panel">
        <div class="script">
        <div style="height:1.2vh">&nbsp;</div>
        <div class="script-name">{meta.name}</div>
        {#each ["townsfolk", "outsider", "minion", "demon"] as type}
            {#if script.find(r => r.type == type)}
            <div class="script-type-divider">
                <span class="script-type">{type[0].toUpperCase() + type.slice(1)}</span>
            </div>
            {#each script as role, idx}
            {#if role.type == type}
                <div class="script-role" draggable={true} 
                    on:dragstart={(ev) => {ev.dataTransfer?.setData("application/x.index", ""+idx); ev.dataTransfer?.setData("text/plain", role.name); ev.dataTransfer.dropEffect = "move"}}
                    on:drop={(ev) => onScriptDrop(ev, idx)}
                    on:dragover={(ev) => ev.preventDefault()}>
                    <img src={role.image} class:homebrew={isHomebrew(role)} class:anth={role.edition == "anth"} on:click={() => {script.splice(idx, 1); script=script}} alt={"delete " + role.name} role="button">
                    <span class="script-role-name" style={"letter-spacing: " + calculateLetterSpacing(role.name, 7)}>
                        {role.name}{#if isHomebrew(role)}<sup>†</sup>{/if}</span>
                    <span class="script-role-ability" style={"letter-spacing: " + calculateLetterSpacing(role.ability, 61)}>{role.ability}</span>
                    <div class="script-role-jinxes">
                    {#each script as role2}
                        {#if jinxes[role.id] && jinxes[role.id][role2.id]}
                        <img src={role2.image} alt={role2.name + " jinx"} title={jinxes[role.id][role2.id]}
                            class:anth={role2.edition == "anth"} />
                        {/if}
                    {/each}
                    </div>
                </div>
            {/if}
            {/each}
            {/if}
        {/each}

        {#if script.filter(x => x.type != "fabled" && x.type != "traveler").length < 25}
        <div class="characters-footer">
            {#each ["fabled", "traveler"] as type}
                <div class={"characters-footer-" + type}>
                {#each script as role}
                    {#if role.type == type}
                    <img src={role.image} alt={role.name} />
                    {/if}
                {/each}
                </div>
            {/each}
        </div>
        {/if}

        <footer>
            <span>Based on <i>Blood on the Clocktower</i> by Steven Medway. <strong>Fan-made homebrew content.</strong></span>
            <span>† - Homebrew character</span>
            <span>* - Not the first night</span>
        </footer>
        </div>
    </div>

    <div class="export-panel">
        <input type="text" placeholder="Script Name" bind:value={meta.name} />
        <input type="text" placeholder="Author" bind:value={meta.author} />

        <fieldset style="display:flex;flex-direction:column;align-items:stretch;gap:8px">
            <button on:click={() => window.print()} class="gray">Export to PDF</button>
            <div style="display:flex;flex-direction:row;gap:8px">
                <button on:click={() => exportScript()} style="flex-grow:1" class="red">Save</button>
                <button on:click={() => fileInput.click()} style="flex-grow:1">Load</button>
            </div>
            <input type="file" id="file-input" bind:this={fileInput} accept="application/json" on:change={importScript} style="opacity:0;position:fixed;top:0;left:0;width:0;height:0;" />
        </fieldset>

        <fieldset style="display:flex;flex-direction:column;align-items:stretch;gap:8px">
            <button on:click={() => {script=[];meta={name:"",author:""}}} class="red">Clear</button>
            <button on:click={sortScript}>Sort by SAO</button>
        </fieldset>

        <div style="flex-grow:1"></div>

        <footer>
            <h3>Unofficial Blood on the Clocktower Script Tool</h3>
            <p>Not an official tool.
                Artwork & character design of official characters belongs to <a href="https://bloodontheclocktower.com/about-us">The Pandemonium Institute</a>.
                Artwork & character design of The Bootlegger's Anthology by Icibalus & others.
                <a href="github.com/allen-B1/script-maker">Source code</a>.</p>
        </footer>
    </div>
</main>