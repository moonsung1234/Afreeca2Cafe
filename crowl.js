
let puppeteer = require("puppeteer");
const { Readable } = require('stream'); 

let config = require("./config");
let env_var = require("./var");

let browser, page;

async function set_puppeteer() {
    browser = await puppeteer.launch({
        executablePath : env_var.EXECUTABLE_PATH,
        args : [
            "--no-sandbox", 
            "--disable-dev-shm-usage"
        ]
    });
    page = await browser.newPage();

    // set viewport
    await page.setViewport({
        width : env_var.DEFAULT_WIDTH,
        height : env_var.DEFAULT_HEIGHT,
        deviceScaleFactor : 1
    });

    return Promise.resolve();
}

async function get_latest_post() {
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
        type = env_var.VIDEO_TYPE;

    } else {
        post_url = "https://bj.afreecatv.com" + post_url;
        type = env_var.TEXT_TYPE;  
    }

    return [type, title, post_url];
}

async function post2image(url, _path) {
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
    
    // get screen stream
    await page.screenshot({
        path : _path,
        clip : content_info
    });
}

module.exports = {
    set_puppeteer,
    get_latest_post,
    post2image
}
