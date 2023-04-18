import { Args, Brief, LongOpt } from "@godgnidoc/decli"

class GlobalOptions {
    @LongOpt('--workspace')
    @Brief('The workspace directory (default: current directory)')
    @Args((_arg) => {
        return true
    })
    workspace: string = process.cwd()

    @LongOpt('--logging')
    @Brief('The logging level (default: info)')
    @Args(['debug', 'info', 'warn', 'error'])
    logging: 'debug' | 'info' | 'warn' | 'error' = 'info'
}

export const globalOptions = new GlobalOptions