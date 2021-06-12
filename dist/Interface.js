"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Interface = void 0;
const Api_1 = require("./Api");
const Database_1 = require("./Database");
const flags_middleware_1 = __importDefault(require("@discord-rose/flags-middleware"));
const admin_middleware_1 = __importDefault(require("@discord-rose/admin-middleware"));
const permissions_middleware_1 = __importDefault(require("@discord-rose/permissions-middleware"));
const EvalCommand_1 = __importDefault(require("./extras/EvalCommand"));
const StatsCommand_1 = __importDefault(require("./extras/StatsCommand"));
const Influx_1 = require("./Influx");
class Interface {
    constructor() {
        this.api = new Api_1.Api();
    }
    createDb(username, password, host = '127.0.0.1') {
        return new Database_1.Database(host, username, password);
    }
    setupMaster(master, name) {
        Influx_1.setupInflux(master, name);
        let wh = null;
        if (process.env.STATUS_WEBHOOK_ID) {
            wh = {
                id: process.env.STATUS_WEBHOOK_ID,
                token: process.env.STATUS_WEBHOOK_TOKEN
            };
        }
        if (wh) {
            master.log = (msg, cluster) => {
                // @ts-expect-error
                const message = `${cluster ? `Cluster ${cluster.id}${' '.repeat(master.longestName - cluster.id.length)}` : `Master ${' '.repeat(master.longestName + 1)}`} | ${msg}`;
                console.log(message);
                if (!wh)
                    return;
                master.rest.webhooks.send(wh.id, wh.token, {
                    content: message,
                    username: name
                });
            };
        }
    }
    setupWorker(worker) {
        worker.commands
            .middleware(flags_middleware_1.default())
            .middleware(admin_middleware_1.default((id) => {
            return this.api.isAdmin(id);
        }))
            .middleware(permissions_middleware_1.default());
        this.addCommands(worker);
    }
    addCommands(worker) {
        worker.commands
            .add(StatsCommand_1.default)
            .add(EvalCommand_1.default);
    }
    collectMessage(ctx, filter, opts) {
        return new Promise((resolve, reject) => {
            let timeout;
            const listener = (message) => {
                if (filter(message)) {
                    clear();
                    resolve(message);
                }
            };
            const clear = () => {
                // @ts-expect-error discord-api-types suck
                ctx.worker.off('MESSAGE_CREATE', listener);
                if (timeout)
                    clearTimeout(timeout);
            };
            // @ts-expect-error
            ctx.worker.on('MESSAGE_CREATE', listener);
            if (opts.time)
                timeout = setTimeout(() => {
                    clear();
                    reject('Didn\'t respond in time.');
                }, opts.time);
        });
    }
}
exports.Interface = Interface;
