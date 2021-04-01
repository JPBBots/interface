import { Api } from './Api'
import { Database } from './Database'

import flagsMiddleware from '@discord-rose/flags-middleware'
import adminMiddleware from '@discord-rose/admin-middleware'
import permissionsMiddleware from '@discord-rose/permissions-middleware'

import { Worker } from 'discord-rose'

import EvalCommand from './extras/EvalCommand'

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
}
