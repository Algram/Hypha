'use strict';
const app = require('app');
const fs = require('fs');
const path = require('path');
const configFilePath = path.join(app.getPath('userData'), 'config.json');
let config = null;


function load() {
 if (config !== null) {
 return;
 }

 if (!fs.existsSync(configFilePath)) {
 config = {};
 return;
 }

 config = JSON.parse(fs.readFileSync(configFilePath, 'utf-8'));
}

function save() {
 fs.writeFileSync(configFilePath, JSON.stringify(config));
}

exports.set = function (key, value) {
 load();
 config[key] = value;
 save();
}

exports.get = function (key) {
 load();
 let value = null;
 if (key in config) {
 value = config[key];
 }
 return value;
}

exports.unset = function (key) {
 load();
 if (key in config) {
 delete config[key];
 save();
 }
}
