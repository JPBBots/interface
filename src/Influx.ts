import { Thread } from 'jadl'

import { FieldType, InfluxDB } from 'influx'

export function setupInflux (thread: Pick<Thread, 'getStats'>, name: string) {
  const influx = new InfluxDB({
    host: 'influxdb',
    database: 'stats',
    schema: [
      {
        measurement: 'stats',
        fields: {
          memory: FieldType.INTEGER,
          servers: FieldType.INTEGER,
          ping: FieldType.INTEGER,
          uptime: FieldType.INTEGER,
          name: FieldType.STRING
        },
        tags: []
      }
    ]
  })

  const run = async () => {
    const stats = await thread.getStats()

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
    ])
  }

  return (() => {
    run()

    setInterval(() => {
      run()
    }, 30e3)
  })
}