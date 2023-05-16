import { format } from 'util'
import { upgradeFormat } from './format'
import { LogLevel, isEnabled } from './level'

declare global {
    interface Console {
        verbose(fmt: string, ...args: any[]): void;
    }
}

export function InitiateLogging() {
    console.verbose = function (fmt: string, ...args: any[]) {
        if (process.env['SIDE_VERBOSE'] === 'TRUE') {
            fmt = upgradeFormat(fmt, 'verbose')
            const message = format(fmt, ...args)
            process.stderr.write(message + '\n')
        }
    }
    
    /** 将控制台打印函数均替换为带时间戳、严重性和颜色的打印函数 */
    for (const key of ['debug', 'info', 'warn', 'error']) {
    
        // const func = console[key];
        console[key] = function (fmt: string, ...args: any[]) {
            const sev = key as LogLevel
            if (isEnabled(sev)) {
                fmt = upgradeFormat(fmt, sev)
                const message = format(fmt, ...args)
                process.stderr.write(message + '\n')
            }
        }
    }
}

export { SetLogLevel, GetLogLevel, LogLevel } from './level'