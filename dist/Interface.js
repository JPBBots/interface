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
const discord_rose_1 = require("discord-rose");
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
            const log = (msg) => {
                if (!wh)
                    return;
                master.rest.webhooks.send(wh.id, wh.token, {
                    content: msg,
                    username: name
                });
            };
            master.on('CLUSTER_STARTED', (cluster) => {
                log(`Cluster ${cluster.id} started`);
            });
            master.on('CLUSTER_STOPPED', (cluster) => {
                log(`Cluster ${cluster.id} stopped`);
            });
            master.handlers.on('SHARD_READY', (cluster, { id }) => {
                log(`Shard ${id} on cluster ${cluster.id} ready`);
            });
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
        if (process.env.GUILDS_WEBHOOK_ID) {
            const colors = {
                Joined: 0x109c10,
                Left: 0xc41f1f,
                Unavailable: 0xc4771a,
                Available: 0xe3d512
            };
            const log = (status, guild) => {
                var _a;
                worker.api.webhooks.send(process.env.GUILDS_WEBHOOK_ID, process.env.GUILDS_WEBHOOK_TOKEN, {
                    username: (_a = worker.user) === null || _a === void 0 ? void 0 : _a.username,
                    embeds: [
                        new discord_rose_1.Embed()
                            .color(colors[status])
                            .title(`${status} Server`)
                            .description(`${guild.id}${guild.name ? `, ${guild.name}\n${guild.member_count} members` : ''}`)
                            .render()
                    ]
                });
            };
            const unavailable = new Set();
            worker.on('GUILD_DELETE', (guild) => {
                if (guild.unavailable)
                    return;
                log('Left', guild);
                if (unavailable.has(guild.id))
                    unavailable.delete(guild.id);
            });
            worker.on('GUILD_UNAVAILABLE', (guild) => {
                unavailable.add(guild.id);
                log('Unavailable', guild);
            });
            worker.on('GUILD_CREATE', (guild) => {
                if (unavailable.has(guild.id)) {
                    unavailable.delete(guild.id);
                    return log('Available', guild);
                }
                log('Joined', guild);
            });
        }
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
