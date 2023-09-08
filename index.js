
let request = require("request");
let cheerio = require("cheerio");
let puppeteer = require("puppeteer");
let path = require("path");
let fs = require("fs");

let express = require("express");
let app = express();

const DEFAULT_WIDTH = 2000;
const DEFAULT_HEIGHT = 1000;


function get_env(path) {
    return JSON.parse(fs.readFileSync(path, { encoding : "utf-8" }));
}

function set_env(path, env) {
    fs.writeFileSync(path, JSON.stringify(env), { encoding : "utf-8" });

    return env;
}

let env = get_env("./env.json"); 

async function get_code() {
    let redirect_url = "http://localhost/auth";
    let api_url = `https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=${env.CLIENT_ID}&redirect_uri=${encodeURI(redirect_url)}&state=${env.STATE}`;

    console.log(api_url);

    return new Promise((resolve, reject) => {
        request.get(api_url, (err, res, body) => {
            console.log(res.statusCode);

            if(!err && res.statusCode == 200) {
                resolve(body);

            } else {
                reject(err);
            }
        });
    });
}

async function get_token() {
    let api_url = `https://nid.naver.com/oauth2.0/token?grant_type=authorization_code&client_id=${env.CLIENT_ID}&client_secret=${env.CLIENT_SECRET}&code=${env.CODE}&state=${env.STATE}`;
    let options = {
        url : api_url,
        headers : {
            "X-Naver-Client-Id" : env.CLIENT_ID, 
            "X-Naver-Client-Secret" : env.CLIENT_SECRET 
        }
    }

    return new Promise((resolve, reject) => {
        request.get(options, (err, res, body) => {
            console.log(res.statusCode);

            if(!err && res.statusCode == 200) {
                let json = JSON.parse(body);
                env.ACCESS_TOKEN = json.access_token || env.ACCESS_TOKEN;
                env.REFRESH_TOKEN = json.refresh_token || env.REFRESH_TOKEN;
                env = set_env("env.json", env);

                resolve(body);

            } else {
                reject(err);
            }
        });
    });
}

async function get_new_token() {
    let api_url = `https://nid.naver.com/oauth2.0/token?grant_type=refresh_token&client_id=${env.CLIENT_ID}&client_secret=${env.CLIENT_SECRET}&refresh_token=${env.REFRESH_TOKEN}`;
    let options = {
        url : api_url,
        headers : {
            "X-Naver-Client-Id" : env.CLIENT_ID, 
            "X-Naver-Client-Secret" : env.CLIENT_SECRET 
        }
    }

    return new Promise((resolve, reject) => {
        request.get(options, (err, res, body) => {
            console.log(res.statusCode);
            
            if(!err && res.statusCode == 200) {
                let json = JSON.parse(body);
                env.ACCESS_TOKEN = json.access_token || env.ACCESS_TOKEN;
                env = set_env("env.json", env);
                
                resolve(body);

            } else {
                reject(err);
            }
        });
    });
}

async function post2image(_path) {
    let browser = await puppeteer.launch();
    let page = await browser.newPage();
    
    // set viewport
    await page.setViewport({
        width : DEFAULT_WIDTH,
        height : DEFAULT_HEIGHT,
        deviceScaleFactor : 1
    });

    // move post list
    await page.goto("https://bj.afreecatv.com/devil0108/posts", {
        timeout : 0
    });
    await page.waitForNavigation();

    // get url of first post 
    let post = await page.waitForSelector("#contents > div > div > section:nth-child(3) > section > ul > li:nth-child(1) > div.conts > div > a");
    let post_url = "https://bj.afreecatv.com" + await page.evaluate(element => element.getAttribute("href"), post);

    // move first post
    await page.goto(post_url, {
        timeout : 0
    });
    await page.waitForNavigation();

    // remove ad
    try {
        await page.click("#bs-wrap > div.bs-notice_layer > div.todays > button");

    } catch {
        console.log("ad is not existed");
    }

    // get title
    let title = await page.waitForSelector("#contents > div > div > div > div > section > section.post_header > div > h2");
    title = await page.evaluate(element => element.textContent, title);
    title = title.slice(2);

    // get content info
    let content = await page.waitForSelector("#contents > div > div > div > div > section > section.post_detail");
    let content_info = await content.boundingBox();
    
    // save image
    await page.screenshot({
        path : _path,
        clip : content_info
    });

    await browser.close();

    return title;
}

function write_post(title, content, _path) {
    let header = "Bearer " + env.ACCESS_TOKEN;
    let _title = encodeURI(title);
    let _content = encodeURI(content); 
    
    let formData = {
        subject : _title, 
        content : _content,
        image : [
            {
                value: fs.createReadStream(path.join(__dirname, _path)),
                options: { 
                    filename : _path,  
                    contentType: "image/" + path.extname(_path).slice(1)
                }
            }
        ]
    }
    let options = {
        url : `https://openapi.naver.com/v1/cafe/${env.CLUB_ID}/menu/${env.MENU_ID}/articles`,
        formData,
        headers : {
            "Authorization" : header
        }
    }
    
    console.log(options);

    return new Promise((resolve, reject) => {
        request.post(options, (err, res, body) => {
            console.log(res.statusCode);

            if(!err && res.statusCode == 200) {
                resolve(body);
    
            } else {
                reject(err);
            }
        });
    });
}

async function run() {
    try {
        // console.log(await get_new_token());
        let title = await post2image("post.png");
        console.log(title);
        console.log(await write_post(title, "공지", "post.png"));

    } catch(err) {
        console.error(err);
    }
}

(async () => {
    await run();
})();

// app.get("/auth", async (req, res) => {
//     let code = req.query.code;
//     env.CODE = code;
//     env = set_env("env.json", env);

//     console.log("code : ", code);

//     await run();
// });

// app.listen(80, async () => {
//     console.log("Redirect Server Run!");

//     await get_code()
// });


