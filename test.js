let puppeteer = require("puppeteer");


const DEFAULT_WIDTH = 2000;
const DEFAULT_HEIGHT = 1000;
const DELAY = 1000 * 60; // 1 minute
const ENV_PATH = "env.json";
const POST_PATH = "post.png";
const VIDEO_TYPE = Symbol("video");
const TEXT_TYPE = Symbol("text");

async function get_latest_post() {
    let browser = await puppeteer.launch();
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

(async () => {
    console.log(await get_latest_post());
})();
