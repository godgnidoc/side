import { execute, verifyDefinitions } from '@godgnidoc/decli'
import { Side } from './side/index'
import { GetLogLevel, InitiateLogging, SetLogLevel } from 'logging'
import { deprecateDeplock } from 'side/update'

export async function main() {
    /** 初始化日志支持 */
    InitiateLogging()

    /** 执行升级流程 */
    await deprecateDeplock()

    /** 执行命令 */
    const app = new Side()
    const args = process.argv.slice(2)
    // console.verbose('side: %o', args)
    try {
        if (process.env['SIDE_DEBUG'] == 'TRUE' || process.env['SIDE_VERBOSE'] == 'TRUE') {
            SetLogLevel('debug')
            console.verbose('Debug mode enabled.')
            if (!verifyDefinitions(app)) {
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
