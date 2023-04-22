import { Args, Brief, LongOpt } from "@godgnidoc/decli"

class GlobalOptions {
    /** 日志等级 */
    @LongOpt('--logging')
    @Brief('The logging level (default: info)')
    @Args(['debug', 'info', 'warn', 'error'])
    logging: 'debug' | 'info' | 'warn' | 'error' = 'info'
}

export const globalOptions = new GlobalOptions