import { MongoClient, Db, Collection } from 'mongodb';
export declare class Database {
    username: string;
    mongo: MongoClient;
    db?: Db;
    connected: boolean;
    waitingQueue: {
        collection: string;
        req: any[];
        promise: (any: any) => any;
    }[];
    constructor(host: string, username: string, password: string);
    connect(): Promise<void>;
    get collection(): (name: string) => Collection;
}
