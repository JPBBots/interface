"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Api = void 0;
const node_fetch_1 = __importDefault(require("node-fetch"));
class Api {
    constructor() {
        this.url = 'https://jpbbots.org/api';
    }
    _request(method, url, body) {
        return node_fetch_1.default(`${this.url}${url}`, {
            method
        }).then(x => x.text());
    }
    async isAdmin(id) {
        const req = await this._request('GET', `/admin/${id}`);
        return !!Number(req);
    }
    async getPremium(id) {
        const req = await this._request('GET', `/premium/${id}`);
        return Number(req);
    }
}
exports.Api = Api;
