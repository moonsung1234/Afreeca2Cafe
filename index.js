
let config = require("./config");
let env_var = require("./var");
let auth = require("./auth");
let crowl = require("./crowl");

let env = config.get_env(env_var.ENV_PATH);

let express = require("express");
let app = express();

async function run(type, title, url) {
    let content = "(이 글은 프로그램에 의해 자동적으로 작성되었습니다.)";

    try {
        if(type == env_var.TEXT_TYPE) {
            await crowl.post2image(url, env_var.POST_PATH);   
        }
        
    } catch(err) {
        console.error("Post Crowling Error : ", err);

        return;
    }

    try {
        if(type == env_var.TEXT_TYPE) {
            console.log(await auth.write_post(type, title, content, env_var.POST_PATH));

        } else if(type == env_var.VIDEO_TYPE) {
            content = `<a href=${url}>아프리카 다시보기 바로가기</a><br><br>${content}`;

            console.log(await auth.write_post(type, title, content, env_var.POST_PATH));
        }
        
    } catch(err) {
        console.error("Writing Error : ", err);
        console.log(await auth.get_new_token());
        console.log(await auth.write_post(type, title, content, env_var.POST_PATH));
    }
}

let before = null;
let iter;

crowl.set_puppeteer()
.then(() => {
    iter = setInterval(async () => {
        let temp = new Date();
        let date = new Date(temp.setHours(temp.getHours() + 9));
        let type, title, url;
        
        console.log(date);
        
        try {
            [type, title, url] = await crowl.get_latest_post();
            title = "[아프리카 공지] " + title;
            
            console.log(type, title, url);
            
        } catch(err) {
            console.error("List Crowling Error : ", err);

            return;
        }

        if(title + url != before) {
            await run(type, title, url);

            before = title + url;

            console.log("send!");
        }
    }, env_var.DELAY);
});

// app.get("/", (req, res) => {
//     res.send("afreeca to cafe server");
// });

// app.get("/auth", async (req, res) => {
//     let code = req.query.code;
//     env.CODE = code;
//     env = set_env("env.json", env);

//     console.log("code : ", code);

//     await run();
// });

// app.listen(3000, () => {
//     console.log("Server Run!");
// });


