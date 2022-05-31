import { Thread } from 'jadl'

import { FieldType, InfluxDB } from 'influx'
import { request } from 'undici'

export function setupInflux(thread: Pick<Thread, 'getStats'>, name: string) {
  const influx = new InfluxDB({
    host: process.env.INFLUX_URL ?? 'influxdb',
    database: 'stats',
    schema: [
      {
        measurement: 'stats',
        fields: {
          memory: FieldType.INTEGER,
          servers: FieldType.INTEGER,
          ping: FieldType.INTEGER,
          uptime: FieldType.INTEGER,
          name: FieldType.STRING,
        },
        tags: [],
      },
    ],
  })

  const run = async () => {
    const { body } = await request('https://discord.com/api/gateway')
    const gateway = await body.json()

    // cloudflare ban check
    if (!gateway.url) return

    const stats = await thread.getStats()

    void influx.writePoints([
      {
        measurement: 'stats',
        fields: {
          memory: process.memoryUsage().rss,
          servers: stats.reduce(
            (a, b) => a + b.shards.reduce((c, d) => c + d.guilds, 0),
            0
          ),
          ping:
            stats.reduce(
              (a, b) =>
                a + b.shards.reduce((c, d) => c + d.ping, 0) / b.shards.length,
              0
            ) / stats.length,
          uptime: process.uptime(),
          name,
        },
      },
    ])
  }

  return () => {
    run().catch()

    setInterval(() => {
      run().catch()
    }, 30e3)
  }
}
