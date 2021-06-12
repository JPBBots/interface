import { Api } from './Api'
import { Database } from './Database'

import flagsMiddleware from '@discord-rose/flags-middleware'
import adminMiddleware from '@discord-rose/admin-middleware'
import permissionsMiddleware from '@discord-rose/permissions-middleware'

import { CommandContext, Embed, Master, Worker } from 'discord-rose'

import EvalCommand from './extras/EvalCommand'
import StatsCommand from './extras/StatsCommand'

import { setupInflux } from './Influx'

import { APIMessage, Snowflake } from 'discord-api-types'
import { CachedGuild } from 'discord-rose/dist/typings/Discord'

export class Interface {
  api = new Api()

  createDb (username: string, password: string, host: string = '127.0.0.1') {
    return new Database(host, username, password)
  }

  setupMaster (master: Master, name: string) {
    setupInflux(master, name)

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
        master.rest.webhooks.send(wh.id, wh.token, {
          content: msg,
          username: name
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
    }
  }

  setupWorker (worker: Worker) {
    worker.commands
      .middleware(flagsMiddleware())
      .middleware(adminMiddleware((id) => {
        return this.api.isAdmin(id)
      }))
      .middleware(permissionsMiddleware())

    this.addCommands(worker)

    if (process.env.GUILDS_WEBHOOK_ID) {
      const colors = {
        Joined: 0x109c10,
        Left: 0xc41f1f,
        Unavailable: 0xc4771a,
        Available: 0xe3d512
      }
      const log = (status: 'Joined' | 'Left' | 'Unavailable' | 'Available', guild: CachedGuild) => {
        worker.api.webhooks.send(process.env.GUILDS_WEBHOOK_ID as Snowflake, process.env.GUILDS_WEBHOOK_TOKEN as string, {
          username: worker.user?.username,
          embeds: [
            new Embed()
              .color(colors[status])
              .title(`${status} Server`)
              .description(`${guild.id}${guild.name ? `, ${guild.name}\n${guild.member_count} members` : ''}`)
              .render()
          ]
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
        log('Unavailable', guild)
      })
      worker.on('GUILD_CREATE', (guild) => {
        if (unavailable.has(guild.id)) {
          unavailable.delete(guild.id)

          return log('Available', guild)
        }

        log('Joined', guild)
      })
    }
  }

  addCommands (worker: Worker) {
    worker.commands
      .add(StatsCommand)
      .add(EvalCommand)
  }

  collectMessage (ctx: CommandContext, filter: (message: APIMessage) => boolean, opts: { time: number }): Promise<APIMessage> {
    return new Promise((resolve, reject) => {
      let timeout: NodeJS.Timeout
      const listener = (message: APIMessage) => {
        if (filter(message)) {
          clear()

          resolve(message)
        }
      }

      const clear = () => {
        // @ts-expect-error discord-api-types suck
        ctx.worker.off('MESSAGE_CREATE', listener)

        if (timeout) clearTimeout(timeout)
      }

      // @ts-expect-error
      ctx.worker.on('MESSAGE_CREATE', listener)

      if (opts.time) timeout = setTimeout(() => {
        clear()
        reject('Didn\'t respond in time.')
      }, opts.time)
    })
  }
}
