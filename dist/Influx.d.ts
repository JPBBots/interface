import { Thread } from 'discord-rose';
export declare function setupInflux(thread: Pick<Thread, 'getStats'>, name: string): () => void;
