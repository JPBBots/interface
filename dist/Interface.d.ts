import { Api } from './Api';
import { Database } from './Database';
import { CommandContext, Master, Worker, SingleWorker } from 'discord-rose';
import { APIMessage } from 'discord-api-types';
export declare class Interface {
    api: Api;
    createDb(username: string, password: string, host?: string): Database;
    setupSingleton(worker: SingleWorker, name: string): void;
    setupMaster(master: Master, name: string): void;
    setupWorker(worker: Worker): void;
    addCommands(worker: Worker): void;
    collectMessage(ctx: CommandContext, filter: (message: APIMessage) => boolean, opts: {
        time: number;
    }): Promise<APIMessage>;
}
