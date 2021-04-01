"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Interface = void 0;
const Api_1 = require("./Api");
const Database_1 = require("./Database");
class Interface {
    constructor() {
        this.api = new Api_1.Api();
    }
    createDb(username, password, host = '127.0.0.1') {
        return new Database_1.Database(host, username, password);
    }
}
exports.Interface = Interface;
