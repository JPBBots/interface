import { Api } from './Api'
import { Database } from './Database'

import flagsMiddleware from '@discord-rose/flags-middleware'
import adminMiddleware from '@discord-rose/admin-middleware'
import permissionsMiddleware from '@discord-rose/permissions-middleware'

import { CommandContext, Worker } from 'discord-rose'

import EvalCommand from './extras/EvalCommand'
import { APIMessage } from 'discord-api-types'

export class Interface {
  api = new Api()

  createDb (username: string, password: string, host: string = '127.0.0.1') {
    return new Database(host, username, password)
  }

  setupWorker (worker: Worker) {
    worker.commands
      .middleware(flagsMiddleware())
      .middleware(adminMiddleware((id) => {
        return this.api.isAdmin(id)
      }))
      .middleware(permissionsMiddleware())

    // extra commands
    worker.commands
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
