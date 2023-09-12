
let request = require("request");
let cheerio = require("cheerio");
let puppeteer = require("puppeteer");
let path = require("path");
let fs = require("fs");

let express = require("express");
let app = express();

const DEFAULT_WIDTH = 2000;
const DEFAULT_HEIGHT = 1000;
const DELAY = 1000 * 60; // 1 minute
const ENV_PATH = "env.json";
const POST_PATH = "post.png";
const VIDEO_TYPE = Symbol("video");
const TEXT_TYPE = Symbol("text");

function get_env(path) {
    return JSON.parse(fs.readFileSync(path, { encoding : "utf-8" }));
}

function set_env(path, env) {
    fs.writeFileSync(path, JSON.stringify(env), { encoding : "utf-8" });

    return env;
}

let env = get_env(ENV_PATH); 

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

async function get_latest_post() {
    let browser = await puppeteer.launch(
        {
            executablePath: '/usr/bin/chromium',
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            headless: true,
            userDataDir: './user-data',
        }
    );
    let page = await browser.newPage();

    // set viewport
    await page.setViewport({
        width : DEFAULT_WIDTH,
        height : DEFAULT_HEIGHT,
        deviceScaleFactor : 1
    });

    // move post list
    await page.goto("https://bj.afreecatv.com/devil0108/posts/67256714?page=1&months=3M", {
        timeout : 0
    });
    await page.waitForNavigation();

    // get title
    let title = await page.waitForSelector("#contents > div > div > section:nth-child(3) > section > ul > li:nth-child(1) > div.conts > div.post_conts > a > div > div > strong");
    title = await page.evaluate(element => element.textContent, title);

    // get url of first post 
    let post = await page.waitForSelector("#contents > div > div > section:nth-child(3) > section > ul > li:nth-child(1) > div.conts > div > a");
    let post_url = await page.evaluate(element => element.getAttribute("href"), post);
    let type; 

    if(post_url.indexOf("vod.afreecatv.com") != -1) {
        post_url = "https:" + post_url;
        type = VIDEO_TYPE;

    } else {
        post_url = "https://bj.afreecatv.com" + post_url;
        type = TEXT_TYPE;  
    }

    return [type, title, post_url];
}

async function post2image(url, _path) {
    let browser = await puppeteer.launch(
        {
            executablePath : "/usr/bin/chromium-browser"
        }
    );
    let page = await browser.newPage();
    
    // set viewport
    await page.setViewport({
        width : DEFAULT_WIDTH,
        height : DEFAULT_HEIGHT,
        deviceScaleFactor : 1
    });

    // move post
    await page.goto(url, {
        timeout : 0
    });
    await page.waitForNavigation();

    // remove ad
    try {
        await page.click("#bs-wrap > div.bs-notice_layer > div.todays > button");

    } catch {
        console.log("ad is not existed");
    }

    // get content info
    let content = await page.waitForSelector("#contents > div > div > div > div > section > section.post_detail");
    let content_info = await content.boundingBox();
    
    // save image
    await page.screenshot({
        path : _path,
        clip : content_info
    });

    await browser.close();
}

function write_post(type, title, content, _path) {
    let header = "Bearer " + env.ACCESS_TOKEN;
    let _title = encodeURI(title);
    let _content = encodeURI(content); 
    let formData;

    if(type == TEXT_TYPE) {
        formData = {
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
        
    } else if(type == VIDEO_TYPE) {
        formData = {
            subject : _title,
            content : _content
        }
    }
    
    let options = {
        url : `https://openapi.naver.com/v1/cafe/${env.CLUB_ID}/menu/${env.MENU_ID}/articles`,
        formData,
        headers : {
            "Authorization" : header
        }
    }
    
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

async function run(type, title, url) {
    let content = "(이 글은 프로그램에 의해 자동적으로 작성되었습니다.)";

    console.log("run1");

    try {
        if(type == TEXT_TYPE) {
            await post2image(POST_PATH);   
        }
        
    } catch(err) {
        console.error("Post Crowling Error : ", err);

        return;
    }
    
    console.log("run2");

    try {
        if(type == TEXT_TYPE) {
            console.log(await write_post(type, title, content, POST_PATH));

        } else if(type == VIDEO_TYPE) {
            content = `<a href=${url}>아프리카 다시보기 바로가기</a><br><br>${content}`;

            console.log(await write_post(type, title, content, POST_PATH));
        }
        
    } catch(err) {
        console.error("Writing Error : ", err);
        console.log(await get_new_token());
        console.log(await write_post(type, title, content, POST_PATH));
    }

    
    console.log("run3");
}

// (async() => {
//     let [type, title, url] = await get_latest_post();

//     console.log(type, title, url);
//     // await run(type, title, url);
// })();

let before = null;
// let iter = setInterval(async () => {
//     let temp = new Date();
//     let date = new Date(temp.setHours(temp.getHours() + 9));
//     let type, title, url;
    
//     console.log(date);
    
//     try {
//         [type, title, url] = await get_latest_post();
//         title = "[아프리카 공지] " + title;
        
//         console.log(type, title, url);
        
//     } catch(err) {
//         console.error("List Crowling Error : ", err);

//         return;
//     }

//     if(title + url != before) {
//         await run(type, title, url);

//         before = title + url;
//     }
// }, DELAY);

app.get("/", (req, res) => {
    res.send("afreeca to cafe server");
});

app.get("/auth", async (req, res) => {
    let code = req.query.code;
    env.CODE = code;
    env = set_env("env.json", env);

    console.log("code : ", code);

    await run();
});

app.listen(80, () => {
    console.log("Server Run!");
});


