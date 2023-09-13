
let fs = require("fs");

function get_env(path) {
    return JSON.parse(fs.readFileSync(path, { encoding : "utf-8" }));
}

function set_env(path, env) {
    fs.writeFileSync(path, JSON.stringify(env), { encoding : "utf-8" });

    return env;
}

module.exports = {
    get_env, 
    set_env
}
