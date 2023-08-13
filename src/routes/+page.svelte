
<script lang="ts">
    import anthRoles from '$lib/anth.json';
    import pattersRoles from '$lib/base-patters.json';
    import officialRoles from '$lib/base-official.json';

    type Role = { id: string, name: string, edition: string, type: string, ability: string, firstNight?: number, otherNight?: number, image: string };

    const officialRolesRecord = ((a) => {
        let d = {};
        for (let role of a) {
            d[role.id.toLowerCase().replace(/\s+/g, "_").replace(/[^A-Za-z0-9_\-]/g, "")] = role;
        }
        return d;
    })(officialRoles);

    const anthRoleRecord = {};
    for (let role of anthRoles) {
        anthRoleRecord[role.id] = role;
    }

    let roles: Role[] = [];
    for (let role of pattersRoles.data) {
        let id = role.name.toLowerCase().replace(/\s+/g, "_").replace(/[^A-Za-z0-9_\-]/g, "");
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
        roles.push({
            id: role.id,
            name: role.name,
            edition: "anth",
            type: role.team,

            ability: role.ability,
            firstNight: role.firstNight,
            otehrNight: role.otherNight,
            image: role.image
        });
    }

    const rolesRecord: Record<string, Role> = {};
    for (let role of roles) {
        rolesRecord[role.id] = role;
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
    
    const meta = {
        name: "",
        author: "",
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

    function toggleRole(role) {
        let i = script.indexOf(role);
        if (i == -1) {
            script.push(role);
            normalizeScript(script);
        } else {
            script.splice(i, 1);
        }
        script = script;
    }

    function calculateLetterSpacing(text: string, target: number): strring{
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
            const types = { "townsfolk": 0, "outsider": 1, "minion": 2, "demon": 3 };
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
            if (["tb", "bmr", "snv", "exp"].includes(role.edition)) {
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
            let categoryOf = (ability) => 
                ability.startsWith("You start knowing") ? 0 :
                ability.startsWith("Each night*") ? 2 : 
                ability.startsWith("Each night") ? 1 :
                ability.startsWith("Each day") ? 3 :
                ability.startsWith("Once per game, at night*") ? 5 :
                ability.startsWith("Once per game, at night") ? 4 :
                ability.startsWith("Once per game, during the day") ? 6 : 7;

            let catA = categoryOf(a.ability), catB = categoryOf(b.ability);
            if (catA != catB) return catA - catB;
            
            return a.ability < b.ability ? -1 : a.ability === b.ability ? 0 : 1;
        });
        script = script;
    }
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
    background: hsl(200, 50%, 85%);
}

.script {
    width: 77vh;
    height: 100vh;
    background: #fff;
    margin: auto;
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
}
.script-role img {
    width: 4vh;
    margin-right: 0.5vh;
}
.script-role-img-homebrew {
    margin-top: 0.5vh;
}
.script-role-name {
    width: 8vh;
    display: inline-block;
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


.export-panel {
    padding: 16px;
}
.export-panel fieldset {
    margin-bottom: 32px;
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
}
.red {
    background: hsl(0, 70%, 50%);
}
.gray { background: hsl(220, 5%, 50%); }
</style>

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

            <fieldset>
            Filter by type:
            <div><input type="radio" name="filter-type" id="filter-alltypes" value="all" bind:group={filter.type} /> <label for="filter-alltypes">All</label></div>
            <div><input type="radio" name="filter-type" id="filter-townsfolk" value="townsfolk" bind:group={filter.type} /> <label for="filter-townsfolk">Townsfolk</label></div>
            <div><input type="radio" name="filter-type" id="filter-outsider" value="outsider" bind:group={filter.type} /> <label for="filter-outsider">Outsider</label></div>
            <div><input type="radio" name="filter-type" id="filter-minion" value="minion" bind:group={filter.type} /> <label for="filter-minion">Minion</label></div>
            <div><input type="radio" name="filter-type" id="filter-demon" value="demon" bind:group={filter.type} /> <label for="filter-demon">Demon</label></div>
            </fieldset>
        </div>
        <div class="categories">
            {#each ["townsfolk", "outsider", "minion", "demon"] as chartype}
            <div class="category">
                <div class="category-name">{chartype[0].toUpperCase() + chartype.slice(1)}</div>
                <div class="category-list">
                    {#each roles as role}
                    {#if role.type == chartype && applyFilter(role, filter)}
                    <div class="character" class:active={script.includes(role)} on:click={() => toggleRole(role)}>
                        <img src={role.image} width="32">
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
        <div style="height:1vh">&nbsp;</div>
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
                    <img src={role.image} width="32" class:script-role-img-homebrew={role.edition == "anth"}>
                    <span class="script-role-name" style={"letter-spacing: " + calculateLetterSpacing(role.name, 7)}>{role.name}</span>
                    <span class="script-role-ability" style={"letter-spacing: " + calculateLetterSpacing(role.ability, 61)}>{role.ability}</span>
                </div>
            {/if}
            {/each}
            {/if}
        {/each}
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
            <input type="file" id="file-input" bind:this={fileInput} accept="application/json" on:change={importScript} style="opacity:0;position:fixed" />
        </fieldset>

        <fieldset style="display:flex;flex-direction:column;align-items:stretch;gap:8px">
            <button on:click={() => script=[]} class="red">Clear</button>
            <button on:click={sortScript}>Sort by SAO</button>
        </fieldset>
    </div>
</main>