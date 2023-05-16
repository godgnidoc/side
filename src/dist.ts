import { execute, verifyDefinitions } from '@godgnidoc/decli'
import { GetLogLevel, InitiateLogging, SetLogLevel } from 'logging'
import { Dist } from './dist/index'

export async function main() {
    /** 初始化日志支持 */
    InitiateLogging()

    const app = new Dist()
    const args = process.argv.slice(2)
    try {
        if( process.env['SIDE_DEBUG'] == 'TRUE') {
            SetLogLevel('debug')
            console.debug('Debug mode enabled.')
            if(!verifyDefinitions(app)) {
                console.error('Invalid command definitions.')
                process.exit(-1)
            }
        }
        const ret = await execute(app, args)
        process.exit(ret)
    } catch (err) {
        if (err instanceof Error) {
            if (GetLogLevel() === 'debug')
                console.error(err)
            else
                console.error(err.message)
        }
        else
            console.error(err)
        process.exit(-1)
    }
}

main()
