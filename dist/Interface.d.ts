import { Api } from './Api';
import { Database } from './Database';
export declare class Interface {
    api: Api;
    createDb(username: string, password: string, host?: string): Database;
}
