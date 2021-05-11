"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = __importDefault(require("util"));
function clean(text) {
    if (typeof (text) === 'string') {
        return text.replace(/`/g, '`' + String.fromCharCode(8203)).replace(/@/g, '@' + String.fromCharCode(8203));
    }
    else {
        return text;
    }
}
let last;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let temp;
exports.default = {
    command: 'eval',
    admin: true,
    description: 'Evaluates code',
    exec: async (ctx) => {
        if (ctx.message.author.id !== '142408079177285632')
            return ctx.error('Bonk, no eval fo u');
        const worker = ctx.worker;
        try {
            const code = ctx.message.content.slice(Number(ctx.prefix.length) + Number(ctx.ran.length));
            let evaled;
            if (ctx.flags.m)
                evaled = await worker.comms.masterEval(code);
            else if (ctx.flags.b)
                evaled = await worker.comms.broadcastEval(code);
            // eslint-disable-next-line no-eval
            else
                evaled = eval(code);
            if (evaled && evaled instanceof Promise)
                evaled = await evaled;
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            if (ctx.flags.l)
                last = evaled;
            if (typeof evaled !== 'string') {
                evaled = util_1.default.inspect(evaled);
            }
            if (ctx.flags.s)
                return;
            void ctx.embed
                .color(0x28bf62)
                .title('Eval Successful')
                .description(`\`\`\`xl\n${evaled}\`\`\``)
                .send();
        }
        catch (err) {
            void ctx.embed
                .color(0xdb0b0b)
                .title('Eval Unsuccessful')
                .description(`\`\`\`xl\n${clean(err)}\`\`\``)
                .send();
        }
    }
};
