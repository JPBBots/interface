"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupInflux = void 0;
const influx_1 = require("influx");
function setupInflux(thread, name) {
    const influx = new influx_1.InfluxDB({
        host: 'localhost',
        database: 'stats',
        schema: [
            {
                measurement: 'stats',
                fields: {
                    memory: influx_1.FieldType.INTEGER,
                    servers: influx_1.FieldType.INTEGER,
                    ping: influx_1.FieldType.INTEGER,
                    uptime: influx_1.FieldType.INTEGER,
                    name: influx_1.FieldType.STRING
                },
                tags: []
            }
        ]
    });
    const run = async () => {
        const stats = await thread.getStats();
        void influx.writePoints([
            {
                measurement: 'stats',
                fields: {
                    memory: process.memoryUsage().rss,
                    servers: stats.reduce((a, b) => a + b.shards.reduce((c, d) => c + d.guilds, 0), 0),
                    ping: stats.reduce((a, b) => a + (b.shards.reduce((c, d) => c + d.ping, 0) / b.shards.length), 0) / stats.length,
                    uptime: process.uptime(),
                    name
                }
            }
        ]);
    };
    return (() => {
        run();
        setInterval(() => {
            run();
        }, 30e3);
    });
}
exports.setupInflux = setupInflux;
