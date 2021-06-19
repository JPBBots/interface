import { Snowflake } from 'discord-api-types';
export declare class Api {
    url: string;
    _request(method: 'GET' | 'POST', url: string, body?: any): Promise<string>;
    isAdmin(id: Snowflake): Promise<boolean>;
    getPremium(id: Snowflake): Promise<number>;
}
