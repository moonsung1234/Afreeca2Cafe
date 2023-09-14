
let request = require("request");

let env_var = require("./var");

let client;

function set_client(_client) {
    client = _client;
}

async function get_code() {
    let client_id = await client.get("CLIENT_ID");
    let state = await client.get("STATE");

    let redirect_url = "http://localhost/auth";
    let api_url = `https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=${client_id}&redirect_uri=${encodeURI(redirect_url)}&state=${state}`;

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
    let client_id = await client.get("CLIENT_ID");
    let client_secret = await client.get("CLIENT_SECRET");
    let code = await client.get("CODE");
    let state = await client.get("STATE");

    let api_url = `https://nid.naver.com/oauth2.0/token?grant_type=authorization_code&client_id=${client_id}&client_secret=${client_secret}&code=${code}&state=${state}`;
    let options = {
        url : api_url,
        headers : {
            "X-Naver-Client-Id" : client_id, 
            "X-Naver-Client-Secret" : client_secret 
        }
    }

    return new Promise((resolve, reject) => {
        request.get(options, async (err, res, body) => {
            console.log(res.statusCode);

            if(!err && res.statusCode == 200) {
                let json = JSON.parse(body);

                json.access_token? await client.set("ACCESS_TOKEN", json.access_token) : true;
                json.refresh_token? await client.set("REFRESH_TOKEN", json.refresh_token) : true;

                resolve(body);

            } else {
                reject(err);
            }
        });
    });
}

async function get_new_token() {
    let client_id = await client.get("CLIENT_ID");
    let client_secret = await client.get("CLIENT_SECRET");
    let refresh_token = await client.get("REFRESH_TOKEN");

    let api_url = `https://nid.naver.com/oauth2.0/token?grant_type=refresh_token&client_id=${client_id}&client_secret=${client_secret}&refresh_token=${refresh_token}`;
    let options = {
        url : api_url,
        headers : {
            "X-Naver-Client-Id" : client_id, 
            "X-Naver-Client-Secret" : client_secret
        }
    }

    return new Promise((resolve, reject) => {
        request.get(options, async (err, res, body) => {
            console.log(res.statusCode);
            
            if(!err && res.statusCode == 200) {
                let json = JSON.parse(body);

                json.access_token? await client.set("ACCESS_TOKEN", json.access_token) : true;
                json.refresh_token? await client.set("REFRESH_TOKEN", json.refresh_token) : true;

                resolve(body);

            } else {
                reject(err);
            }
        });
    });
}

async function write_post(type, title, content, stream) {
    let club_id = await client.get("CLUB_ID");
    let menu_id = await client.get("MENU_ID");
    let access_token = await client.get("ACCESS_TOKEN");

    let header = "Bearer " + access_token;
    let _title = encodeURI(title);
    let _content = encodeURI(content); 
    let formData;

    if(type == env_var.TEXT_TYPE) {
        formData = {
            subject : _title, 
            content : _content,
            image : [
                {
                    value : stream,
                    options : { 
                        filename : "post.png",  
                        contentType : "image/png" 
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
        url : `https://openapi.naver.com/v1/cafe/${club_id}/menu/${menu_id}/articles`,
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
    set_client,
    get_code,
    get_token,
    get_new_token,
    write_post
}