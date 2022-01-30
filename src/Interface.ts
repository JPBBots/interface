import util from 'util'

import { Api } from './Api'
import { Database } from './Database'

import { Master, Worker, SingleWorker, CachedGuild } from 'jadl'

import { Embed } from '@jadl/embed'

import { setupInflux } from './Influx'

import { APIGuild, Routes, Snowflake } from 'discord-api-types/v9'
import { Commands } from './Commands'

export class Interface {
  api = new Api()
  commands = new Commands()

  constructor (public production: boolean = process.env.PRODUCTION === 'true') {}

  createDb(username: string, password: string, host: string = '127.0.0.1') {
    return new Database(host, username, password, this.production)
  }

  setupSingleton(worker: SingleWorker, name: string) {
    this.setupWorker(worker)

    let wh: { id: Snowflake, token: string } | null = null

    if (process.env.STATUS_WEBHOOK_ID) {
      wh = {
        id: process.env.STATUS_WEBHOOK_ID as Snowflake,
        token: process.env.STATUS_WEBHOOK_TOKEN as string
      }
    }

    if (wh) {
      const log = (msg: string): void => {
        if (!wh) return
        worker.api.post(Routes.webhook(wh.id, wh.token), {
          body: {
            content: msg,
            username: name
          }
        })
      }

      worker.on('SHARD_READY', ({ id }) => {
        log(`Shard ${id} ready`)
      })
    }

    if (this.production) {
      const run = setupInflux(worker.comms, name)

      worker.once('READY', () => {
        run()
      })
    }
  }

  setupMaster(master: Master, name: string) {
    if (this.production) {
      const run = setupInflux(master, name)
      master.on('READY', () => {
        run()
      })
    }

    let wh: { id: Snowflake, token: string } | null = null

    if (process.env.STATUS_WEBHOOK_ID) {
      wh = {
        id: process.env.STATUS_WEBHOOK_ID as Snowflake,
        token: process.env.STATUS_WEBHOOK_TOKEN as string
      }
    }

    if (wh) {
      const log = (msg: string): void => {
        if (!wh) return
        master.rest.post(Routes.webhook(wh.id, wh.token), {
          body: {
            content: msg,
            username: name
          }
        })
      }

      master.on('CLUSTER_STARTED', (cluster) => {
        log(`Cluster ${cluster.id} started`)
      })
      master.on('CLUSTER_STOPPED', (cluster) => {
        log(`Cluster ${cluster.id} stopped`)
      })
      master.handlers.on('SHARD_READY', (cluster, { id }) => {
        log(`Shard ${id} on cluster ${cluster.id} ready`)
      })

      if (process.env.ERROR_WEBHOOK_ID) {
        master.once('CLUSTER_STARTED', () => {
          master.rest.on('error', (err) => {
            const embed = new Embed()
              .field('Bot', `${name} (master)`)
              .description(`\`\`\`xl\n${util.inspect(err)}\`\`\``)

            master.rest.post(Routes.webhook(process.env.ERROR_WEBHOOK_ID as Snowflake, process.env.ERROR_WEBHOOK_TOKEN), {
              body: {
                embeds: [embed.render()]
              }
            })
          })
        })
      }
    }
  }

  setupWorker(worker: Worker) {
    this.commands.setupWorker(worker)

    if (process.env.GUILDS_WEBHOOK_ID) {
      const colors = {
        Joined: 0x109c10,
        Left: 0xc41f1f,
        Unavailable: 0xc4771a,
        Available: 0xe3d512
      }
      const log = (status: 'Joined' | 'Left' | 'Unavailable' | 'Available', guild: CachedGuild | APIGuild) => {
        worker.api.post(Routes.webhook(process.env.GUILDS_WEBHOOK_ID as Snowflake, process.env.GUILDS_WEBHOOK_TOKEN as string), {
          body: {
            username: worker.user?.username,
            embeds: [
              new Embed()
                .color(colors[status])
                .title(`${status} Server`)
                .description(`${guild.id}${guild.name ? `, ${guild.name}\n${guild.member_count} members` : ''}`)
                .render()
            ]
          }
        })
      }

      const unavailable = new Set()

      worker.on('GUILD_DELETE', (guild) => {
        if (guild.unavailable) return

        log('Left', guild as CachedGuild)

        if (unavailable.has(guild.id)) unavailable.delete(guild.id)
      })
      worker.on('GUILD_UNAVAILABLE', (guild) => {
        unavailable.add(guild.id)
        log('Unavailable', guild as CachedGuild)
      })
      worker.on('GUILD_CREATE', (guild) => {
        if (unavailable.has(guild.id)) {
          unavailable.delete(guild.id)

          return log('Available', guild)
        }

        log('Joined', guild)
      })
    }

    if (process.env.ERROR_WEBHOOK_ID) {
      worker.once('SHARD_READY', () => {
        worker.api.on('error', (err) => {
          const embed = new Embed()
            .field('Bot', `${worker.user?.username} (worker)`)
            .description(`\`\`\`xl\n${util.inspect(err)}\`\`\``)



          worker.api.post(Routes.webhook(process.env.ERROR_WEBHOOK_ID as Snowflake, process.env.ERROR_WEBHOOK_TOKEN as string), {
            body: {
              embeds: [embed.render()]
            }
          })
        })
      })
    }
  }
}
