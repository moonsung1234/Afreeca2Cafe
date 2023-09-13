
let request = require("request");
let path = require("path");
let fs = require("fs");

let config = require("./config");
let env_var = require("./var");

let env = config.get_env(env_var.ENV_PATH);

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
                env = config.set_env("env.json", env);

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
                env.REFRESH_TOKEN = json.refresh_token || env.REFRESH_TOKEN;
                env = config.set_env("env.json", env);
                
                resolve(body);

            } else {
                reject(err);
            }
        });
    });
}

async function write_post(type, title, content, _path) {
    let header = "Bearer " + env.ACCESS_TOKEN;
    let _title = encodeURI(title);
    let _content = encodeURI(content); 
    let formData;

    if(type == env_var.TEXT_TYPE) {
        formData = {
            subject : _title, 
            content : _content,
            image : [
                {
                    value : fs.createReadStream(path.join(__dirname, _path)),
                    options : { 
                        filename : _path,  
                        contentType : "image/" + path.extname(_path).slice(1)
                    }
                }
            ]
        }
        
    } else if(type == env_var.VIDEO_TYPE) {
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

module.exports = {
    get_code,
    get_token,
    get_new_token,
    write_post
}