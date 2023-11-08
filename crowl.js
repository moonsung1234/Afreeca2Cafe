
let puppeteer = require("puppeteer");
let axios = require("axios");

let env_var = require("./var");

let client, browser, page;

function set_client(_client) {
    client = _client;
}

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
}


async function close_puppeteer() {
    await browser.close();
}

async function get_latest_post() {
    // move post list
    await page.goto("https://bj.afreecatv.com/devil0108/posts/67256714?page=1&months=3M", {
        timeout : 0
    });

    // get the title
    let title_selector = "#contents > div > div > section:nth-child(3) > section > ul > li:nth-child(1) > div.conts > div.post_conts > a > div > div > strong";
    await page.waitForSelector(title_selector, { timeout : 0 });

    let title = await page.$(title_selector);
    title = await title.evaluate(element => element.textContent);

    // get URL of the first post
    let post_selector = "#contents > div > div > section:nth-child(3) > section > ul > li:nth-child(1) > div.conts > div > a";
    await page.waitForSelector(post_selector, { timeout: 0 });

    let post = await page.$(post_selector);
    let post_url = await post.evaluate(element => element.getAttribute("href"));
    
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

async function get_afreeca_notice_info(id) {
    return new Promise((resolve, reject) => {
        axios({
            method: "GET",
            url: `https://bjapi.afreecatv.com/api/${id}/board/67256714?page=1&per_page=20&field=title%2Ccontents&keyword=&type=all&months=3M`,
            timeout : 10 * 1000
        })
        .then(res => {
            let data = res.data;

            let notice = data.data[0];
            let title = notice.title_name;
            let post_url = `https://bj.afreecatv.com/${id}/post/${notice.title_no}`;

            console.log("[Requestion] afreeca notice");

            resolve([
                env_var.TEXT_TYPE, 
                title,
                post_url
            ]);
        })
        .catch(err => {
            reject(err);
        });
    });
}

async function post2image(url) {
    // move post
    await page.goto(url, {
        timeout : 0
    });

    // remove ad
    try {
        await page.click("#bs-wrap > div.bs-notice_layer > div.todays > button");

    } catch {
        console.log("ad is not existed");
    }

    // get content info
    let content_selector = "#contents > div > div > div > div > section > section.post_detail";
    await page.waitForSelector(content_selector, { timeout : 0 });

    let content = await page.$(content_selector);
    let content_info = await content.boundingBox();
    
    // get screen stream
    let screen_stream = await page.screenshot({
        encoding : "binary",
        clip : content_info
    });
    
    return screen_stream;
}

module.exports = {
    set_client,
    set_puppeteer,
    close_puppeteer,
    get_latest_post,
    get_afreeca_notice_info,
    post2image
}
