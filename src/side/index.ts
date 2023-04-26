import { execute, verifyDefinitions } from "@godgnidoc/decli"
import { Side } from "./application"
import { GetLogLevel, InitiateLogging, SetLogLevel } from "../logging"
import { fullyInflateEnv } from "../environment"

export async function main() {
    /** 初始化日志支持 */
    InitiateLogging()

    /** 将基础环境变量导出至环境变量 */
    fullyInflateEnv()

    const app = new Side()
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