const $ = id => document.getElementById(id);


/* =========================
   BASIC HELPERS
========================= */


function escapeHTML(value){

    if(value === null || value === undefined)
        return "";

    return String(value)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;");

}



function lineNumber(code,index){

    return code.slice(0,index)
    .split("\n").length;

}




/*
 Finds closing brackets while ignoring strings
*/

function findClosing(code,start){

    const open = code[start];

    const pairs={
        "(" : ")",
        "[" : "]",
        "{" : "}"
    };


    const close=pairs[open];


    if(!close)
        return -1;


    let depth=0;

    let quote=null;


    for(let i=start;i<code.length;i++){

        let c=code[i];


        if(quote){

            if(c==="\\"){

                i++;

                continue;

            }


            if(c===quote)
                quote=null;


            continue;

        }



        if(
            c==="'" ||
            c==='"' ||
            c==="`"
        ){

            quote=c;

            continue;

        }



        if(c===open)
            depth++;


        if(c===close){

            depth--;

            if(depth===0)
                return i;

        }

    }


    return -1;

}





function splitArguments(text){

    let result=[];

    let current="";

    let depth=0;

    let quote=null;



    for(let i=0;i<text.length;i++){

        let c=text[i];


        if(quote){

            current+=c;


            if(c==="\\" ){

                current+=text[++i];

                continue;

            }


            if(c===quote)
                quote=null;


            continue;

        }



        if(
            c==="'" ||
            c==='"' ||
            c==="`"
        ){

            quote=c;

            current+=c;

            continue;

        }



        if(
            c==="(" ||
            c==="[" ||
            c==="{"
        )
            depth++;



        if(
            c===")" ||
            c==="]" ||
            c==="}"
        )
            depth--;



        if(c==="," && depth===0){

            result.push(current.trim());

            current="";

            continue;

        }



        current+=c;

    }



    if(current.trim())
        result.push(current.trim());


    return result;

}





function getString(value){

    if(!value)
        return null;



    let match=value.match(
        /(["'`])([\s\S]*?)\1/
    );


    if(match)
        return match[2];


    return null;

}





function getProperty(args,name){

    const regex=new RegExp(
        "^"+name+"\\s*[:=]"
    );


    for(const arg of args){

        if(regex.test(arg))
            return arg.replace(regex,"").trim();

    }


    return null;

}





/* =========================
   COLORS
========================= */


const discordColors={

blurple:"#5865f2",
blue:"#3498db",
green:"#57f287",
red:"#ed4245",
yellow:"#fee75c",
purple:"#9b59b6",
orange:"#e67e22",
gold:"#f1c40f",
teal:"#1abc9c",
white:"#ffffff",
black:"#000000"

};



function parseColor(value){

    if(!value)
        return null;



    value=value.trim();



    let hex=value.match(
        /#([0-9a-f]{6})/i
    );


    if(hex)
        return "#"+hex[1];



    let rgb=value.match(
        /from_rgb\((.*?)\)/
    );


    if(rgb){

        let nums=rgb[1]
        .split(",")
        .map(x=>parseInt(x.trim()));


        if(nums.length===3){

            return "#"+
            nums.map(
                x=>x.toString(16).padStart(2,"0")
            ).join("");

        }

    }




    let named=value.match(
        /(blue|red|green|purple|orange|gold|yellow|teal|blurple)/i
    );


    if(named)
        return discordColors[named[1].toLowerCase()];



    let number=value.match(
        /0x([0-9a-f]+)/i
    );


    if(number)
        return "#"+
        number[1].padStart(6,"0");



    return null;

}




/* =========================
 LANGUAGE DETECTION
========================= */


function detectLanguage(code){


    let python=0;

    let js=0;



    if(code.includes("discord.Embed"))
        python+=5;


    if(code.includes("async def"))
        python+=3;


    if(code.includes("discord.py"))
        python+=3;



    if(
        code.includes("EmbedBuilder") ||
        code.includes("MessageEmbed")
    )
        js+=5;



    if(code.includes("require("))
        js+=2;



    if(code.includes("const "))
        js+=2;



    return js>python ? "js":"python";

}

/* =========================
   EMBED PARSER
========================= */


function parseEmbeds(code,lang){


    const embeds={};



    function create(name,line){

        if(!embeds[name]){

            embeds[name]={
                name,
                line,
                title:null,
                description:null,
                color:null,
                url:null,
                author:null,
                footer:null,
                thumbnail:null,
                image:null,
                fields:[],
                sent:false
            };

        }

        return embeds[name];

    }




    /*
        PYTHON discord.Embed()
    */

    if(lang==="python"){


        const regex=/(\w+)\s*=\s*discord\.Embed\s*\(/g;


        let match;


        while((match=regex.exec(code))){


            const start=
            code.indexOf("(",
            match.index);



            const end=findClosing(
                code,
                start
            );


            if(end===-1)
                continue;



            const args=
            splitArguments(
                code.slice(
                    start+1,
                    end
                )
            );



            let e=create(
                match[1],
                lineNumber(
                    code,
                    match.index
                )
            );



            let title=getProperty(
                args,
                "title"
            );


            let description=getProperty(
                args,
                "description"
            );


            let color=getProperty(
                args,
                "color"
            );



            if(title)
                e.title=getString(title)||title;



            if(description)
                e.description=getString(description)||description;



            if(color)
                e.color=parseColor(color);


        }



        /*
          Python properties
        */


        for(const name in embeds){


            let e=embeds[name];



            let propertyRegex=
            new RegExp(
            name+"\\.(title|description|url|color)\\s*=\\s*(.+)",
            "g"
            );



            let p;



            while((p=propertyRegex.exec(code))){


                let value=p[3].trim();



                if(p[1]==="title")
                    e.title=getString(value)||value;



                if(p[1]==="description")
                    e.description=getString(value)||value;



                if(p[1]==="url")
                    e.url=getString(value)||value;



                if(p[1]==="color")
                    e.color=parseColor(value);



            }




            parsePythonMethods(
                code,
                name,
                e
            );


        }


    }




    /*
        JAVASCRIPT
    */


    else{


        const regex=
        /(?:const|let|var)\s+(\w+)\s*=\s*new\s+(?:EmbedBuilder|Discord\.EmbedBuilder|MessageEmbed)\s*\(/g;


        let match;


        while((match=regex.exec(code))){


            let e=create(
                match[1],
                lineNumber(
                    code,
                    match.index
                )
            );



            let pos=
            code.indexOf(
                "(",
                match.index
            );



            let end=findClosing(
                code,
                pos
            );


            parseJSChain(
                code.slice(
                    end+1
                ),
                match[1],
                e
            );


        }


        for(const name in embeds){

            parseJSChain(
                code,
                name,
                embeds[name]
            );

        }



    }



    return Object.values(embeds);

}





function parsePythonMethods(code,name,e){



    const regex=
    new RegExp(
    name+"\\.(\\w+)\\s*\\((.*?)\\)",
    "gs"
    );


    let match;



    while((match=regex.exec(code))){


        const method=match[1];

        const args=splitArguments(match[2]);



        if(method==="add_field"){

            e.fields.push({

                name:
                getString(
                    getProperty(args,"name")
                )||"(dynamic)",


                value:
                getString(
                    getProperty(args,"value")
                )||"(dynamic)",


                inline:
                /True/i.test(match[2])

            });

        }



        if(method==="set_footer"){

            e.footer=
            getString(
                getProperty(args,"text")
            ) || "(dynamic)";

        }



        if(method==="set_thumbnail"){

            e.thumbnail=
            getString(
                getProperty(args,"url")
            );

        }



        if(method==="set_image"){

            e.image=
            getString(
                getProperty(args,"url")
            );

        }



        if(method==="set_author"){

            e.author=
            getString(
                getProperty(args,"name")
            );

        }


    }


}





function parseJSChain(code,name,e){

    const regex = new RegExp(
        "\\b" + name + "\\.(setTitle|setDescription|setColor|setURL|setFooter|setThumbnail|setImage|setAuthor|addFields?|setFields)\\(([^)]*)\\)",
        "g"
    );


    let match;


    while((match = regex.exec(code))){

        const method = match[1];
        const raw = match[2];
        const args = splitArguments(raw);


        if(method === "setTitle"){

            e.title =
            getString(args[0]) || args[0];

        }


        else if(method === "setDescription"){

            e.description =
            getString(args[0]) || args[0];

        }


        else if(method === "setColor"){

            e.color =
            parseColor(args[0]) || "#5865f2";

        }


        else if(method === "setURL"){

            e.url =
            getString(args[0]) || args[0];

        }


        else if(method === "setFooter"){

            let obj = raw.match(/text\s*:\s*["'`](.*?)["'`]/);

            e.footer =
            obj ? obj[1] : getString(raw);

        }


        else if(method === "setThumbnail"){

            e.thumbnail =
            getString(args[0]);

        }


        else if(method === "setImage"){

            e.image =
            getString(args[0]);

        }


        else if(method === "setAuthor"){

            let obj =
            raw.match(/name\s*:\s*["'`](.*?)["'`]/);

            e.author =
            obj ? obj[1] : getString(raw);

        }


        else if(
            method === "addField" ||
            method === "addFields"
        ){

            let fields = raw;


            let names =
            [...fields.matchAll(
                /name\s*:\s*["'`](.*?)["'`]/g
            )];


            let values =
            [...fields.matchAll(
                /value\s*:\s*["'`](.*?)["'`]/g
            )];


            for(let i=0;i<names.length;i++){

                e.fields.push({

                    name:names[i][1],

                    value:
                    values[i]
                    ?
                    values[i][1]
                    :
                    "(dynamic)",

                    inline:
                    /inline\s*:\s*true/i.test(raw)

                });

            }

        }

    }

}

/* =========================
   MESSAGE PARSER
========================= */


function parseMessages(code,embeds){


    const plain=[];
    const ephemeral=[];


    const names=
    embeds.map(e=>e.name);



    const regex=
    /\.(send|reply|followUp|editReply)\s*\(([\s\S]*?)\)/g;


    let match;



    while((match=regex.exec(code))){


        let raw=match[2];



        let embedUsed=null;



        for(const name of names){

            if(
                raw.includes(name)
            ){

                embedUsed=name;

            }

        }



        let isEphemeral=
        /ephemeral\s*[:=]\s*true/i
        .test(raw);



        let content=null;



        let contentMatch=
        raw.match(
        /content\s*[:=]\s*["'`](.*?)["'`]/
        );



        if(contentMatch)
            content=contentMatch[1];



        if(
            !content &&
            !embedUsed
        ){

            let str=
            getString(raw);


            if(str)
                content=str;

        }



        if(
            embedUsed
        )
        {

            const e=
            embeds.find(
            x=>x.name===embedUsed
            );


            if(e)
                e.sent=true;


            continue;

        }



        let obj={
            line:lineNumber(code,match.index),
            method:match[1],
            content
        };



        if(isEphemeral)
            ephemeral.push(obj);

        else
            plain.push(obj);



    }



    return {
        plain,
        ephemeral
    };

}





/* =========================
   RENDERING
========================= */



function renderEmbed(e,index){

let color=e.color || "#5865f2";


return `

<div class="discord-message">


<div class="discord-embed">


<div class="embed-bar"
style="background:${color}">
</div>


<div class="embed-main">


${e.author ? `
<div class="discord-author">
${escapeHTML(e.author)}
</div>
`:""}



${e.thumbnail ? `
<img class="discord-thumb"
src="${escapeHTML(e.thumbnail)}">
`:""}



${e.title ? `

<div class="discord-title ${e.url?"link":""}">
${escapeHTML(e.title)}
</div>

`:""}




${e.description ? `

<div class="discord-description">
${escapeHTML(e.description)}
</div>

`:""}




${e.fields.length ? `

<div class="discord-fields">

${e.fields.map(field=>`

<div class="discord-field">

<div class="field-title">
${escapeHTML(field.name)}
</div>


<div class="field-text">
${escapeHTML(field.value)}
</div>

</div>

`).join("")}

</div>

`:""}




${e.image ? `

<img class="discord-image"
src="${escapeHTML(e.image)}">

`:""}




${e.footer ? `

<div class="discord-footer">

${escapeHTML(e.footer)}

</div>

`:""}


</div>

</div>



<div class="embed-meta">

Embed ${index+1}
|
Line ${e.line}

</div>


</div>

`;

}

function renderMessage(m){


return `

<div class="message">

<div>

<b>${escapeHTML(m.method)}</b>

|

Line ${m.line}

</div>


<p>
${m.content
?
escapeHTML(m.content)
:
"<i>Dynamic content</i>"
}
</p>


</div>

`;

}




function renderResults(data){


const results=
$("results");


$("pane-embeds").innerHTML=
data.embeds.length
?
data.embeds.map(renderEmbed).join("")
:
`<div class="empty">
No embeds found
</div>`;



$("pane-plain").innerHTML =
data.plain.length
?
data.plain.map(renderMessage).join("")
:
`<div class="empty">
No plain text
</div>`;


$("pane-eph").innerHTML =
data.ephemeral.length
?
data.ephemeral.map(renderMessage).join("")
:
`<div class="empty">
No ephemeral text
</div>`;


$("nEmbeds").textContent=
data.embeds.length;



$("nPlain").textContent=
data.plain.length;



$("nEph").textContent=
data.ephemeral.length;



results.classList.add("show");



}





/* =========================
   BUTTON EVENTS
========================= */


const input=$("codeInput");



input.addEventListener(
"input",
()=>{

$("charCount").textContent=
input.value.length
?
input.value.length+" chars"
:
"";

});





$("scanBtn").onclick=()=>{


let code=input.value.trim();


if(!code)
return;



$("scannerCard")
.classList.add(
"loading"
);



$("scanStatus")
.textContent=
"Scanning...";



$("scanBtn")
.disabled=true;



setTimeout(()=>{


let lang=
$("langSelect").value;



if(lang==="auto")
lang=detectLanguage(code);



let embeds=
parseEmbeds(
code,
lang
);



let messages=
parseMessages(
code,
embeds
);



renderResults({

embeds,

plain:messages.plain,

ephemeral:messages.ephemeral

});



$("scannerCard")
.classList.remove(
"loading"
);



$("scanStatus")
.textContent=
"Complete";



$("scanBtn")
.disabled=false;



},Math.min(
1500,
300+
code.length/5
));

};






$("clearBtn").onclick=()=>{


input.value="";


$("results")
.classList.remove(
"show"
);


$("charCount")
.textContent="";


$("scanStatus")
.textContent=
"Ready";


};






document
.querySelectorAll(".tab")
.forEach(tab=>{


tab.onclick=()=>{


document
.querySelectorAll(".tab")
.forEach(x=>
x.classList.remove("active")
);



document
.querySelectorAll(".pane")
.forEach(x=>
x.classList.remove("active")
);



tab.classList.add("active");



$("pane-"+tab.dataset.pane)
.classList.add("active");


};


});
