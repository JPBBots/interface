import { Snowflake } from 'discord-api-types';
export declare class Api {
    url: string;
    private _request;
    isAdmin(id: Snowflake): Promise<boolean>;
    getPremium(id: Snowflake): Promise<number>;
}
