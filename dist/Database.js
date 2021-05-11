"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Database = void 0;
const mongodb_1 = require("mongodb");
class Database {
    constructor(host, username, password) {
        this.username = username;
        this.connected = false;
        this.waitingQueue = [];
        this.mongo = new mongodb_1.MongoClient(`mongodb://${username}:${password}@${host}:27017/`, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        this.connect();
    }
    async connect() {
        await this.mongo.connect();
        this.db = this.mongo.db(this.username);
        this.connected = true;
        this.waitingQueue.forEach(x => {
            this.collection(x.collection).findOne(...x.req).then(res => {
                x.promise(res);
            });
        });
    }
    get collection() {
        var _a;
        if (!this.db) {
            return (name) => ({
                findOne: (..._) => {
                    return new Promise(resolve => {
                        this.waitingQueue.push({
                            collection: name,
                            req: _,
                            promise: resolve
                        });
                    });
                }
            });
        }
        return (_a = this.db) === null || _a === void 0 ? void 0 : _a.collection.bind(this.db);
    }
}
exports.Database = Database;
