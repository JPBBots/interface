import { Embed } from '@jadl/embed'
import { APIMessage, Routes } from 'discord-api-types/v9'
import { Worker } from 'jadl'

import util from 'util'

function clean (text): string {
  if (typeof (text) === 'string') { return text.replace(/`/g, '`' + String.fromCharCode(8203)).replace(/@/g, '@' + String.fromCharCode(8203)) } else { return text }
}

export class Commands {
  private prefixes = [] as string[]
  private oldCommandNames = [] as string[]

  slashCommandEmbed = new Embed()
    .title('We\'re moving to slash commands!')
    .description(
      'As of now, all commands will be run using the `/` prefix\n\n' +
      '**Slash commands not showing up?** \n' +
      'Re-inviting the bot with the new link can fix that\n\n' +
      '[Click here](https://dis.gd/slashcommands) to learn more!'
    )
    .image('https://img.censor.bot/b2nIhRPu.png')

  setupWorker(worker: Worker<{}>) {
    worker.on('READY', () => {
      this.prefixes.push(`<@${worker.user.id}>`, `<@!${worker.user.id}>`)
    })

    worker.on('MESSAGE_CREATE', (msg) => {
      const prefix = this.prefixes.find(x => msg.content.startsWith(x))
      if (!prefix) return

      const args = msg.content.slice(prefix.length).toLowerCase().split(' ')
      const command = args.shift()

      if (command?.startsWith(' ')) command.slice(1)

      if (typeof command !== 'string') return

      if (this.oldCommandNames.includes(command)) {
        return worker.api.post(Routes.channelMessages(msg.channel_id), {
          body: {
            embeds: [this.slashCommandEmbed.render()]
          }
        })
      }

      if (command === 'eval') {
        return this.eval(worker, msg, prefix)
      }
    })
  }

  setupOldCommand(prefixes: string[], commandNames: string[]) {
    this.prefixes.push(...prefixes)

    this.oldCommandNames.push(...commandNames)
  }

  async eval(worker: Worker<{}>, msg: APIMessage, prefix: string) {
    if (msg.author.id !== '142408079177285632') return

    const embed = new Embed()

    try {
      const guild = !!msg.guild_id && worker.guilds.get(msg.guild_id)

      const code = msg.content.slice(prefix.length + ' eval'.length)

      let evaled: string | string[] | Promise<any>

      evaled = eval(code)

      if (evaled && evaled instanceof Promise) evaled = await evaled

      if (typeof evaled !== 'string') {
        evaled = util.inspect(evaled)
      }

      embed
        .color('Green')
        .title('Eval Successful')
        .description(`\`\`\`xl\n${evaled.slice(0, 5000)}\`\`\``)
    } catch (err) {
      embed
        .color('Red')
        .title('Eval Unsuccessful')
        .description(`\`\`\`xl\n${clean(err)}\`\`\``)
    }

    worker.api.post(Routes.channelMessages(msg.channel_id), {
      body: {
        embeds: [
          embed.render()
        ]
      }
    })
  }
}
