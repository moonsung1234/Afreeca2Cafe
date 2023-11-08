
let express = require("express");
let redis = require("redis");

let env_var = require("./var");
let auth = require("./auth");
let crowl = require("./crowl");

let app = express();
let client = redis.createClient({
    socket : {
        host : "svc.sel5.cloudtype.app",
        port : 30821,
        connectTimeout : 50000,
    }
});

async function run(type, title, url) {
    let content = "(이 글은 프로그램에 의해 자동적으로 작성되었습니다.)";
    let stream;

    try {
        if(type == env_var.TEXT_TYPE) {
            stream = await crowl.post2image(url);   
        }
        
    } catch(err) {
        console.error("Post Crowling Error : ", err);

        return false;
    }

    try {
        if(type == env_var.TEXT_TYPE) {
            console.log(await auth.write_post(type, title, content, stream));

        } else if(type == env_var.VIDEO_TYPE) {
            content = `<a href=${url}>아프리카 다시보기 바로가기</a><br><br>${content}`;

            console.log(await auth.write_post(type, title, content, stream));
        }
        
    } catch(err) {
        console.error("Writing Error : ", err);
        console.log(await auth.get_new_token());
        console.log(await auth.write_post(type, title, content, stream));
    }

    return true;
}


app.get("/", (req, res) => {
    res.send("afreeca to cafe server");
});

app.listen(3000, () => {
    console.log("Server Run!");
});

let before = null;
let iter, env;

client.on("connect", async () => {
    console.log("Redis Connected!");

    auth.set_client(client);
    crowl.set_client(client);
    
    iter = setInterval(async () => {
        let temp = new Date();
        let date = new Date(temp.setHours(temp.getHours() + 9));
        let type, title, url;
        
        console.log(date);
    
        try {
            [type, title, url] = await crowl.get_afreeca_notice_info("devil0108");
            title = "[아프리카 공지] " + title;
            
            console.log(type, title, url);
            
        } catch(err) {
            console.error("Notice Requestion Error : ", err);

            return;
        }

        if(title != before) {
            try {
                await crowl.set_puppeteer();
        
            } catch(err) {
                console.error("Setting Error : ", err);
    
                await crowl.close_puppeteer();
    
                return;
            }

            if(await run(type, title, url)) {
                before = title;

                console.log("send!");
            }
        
        } else {
            console.log("already send");
        }
    
        await crowl.close_puppeteer();
    }, env_var.DELAY);
});

client.on("error", (err) => {
    console.error("Redis Client Error : ", err);
});

client.connect();
