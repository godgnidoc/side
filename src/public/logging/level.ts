export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

/** 全局日志严重性阀门 */
let logLevel: LogLevel = 'info'

export function GetLogLevel() {
    return logLevel
}

export function SetLogLevel(level: typeof logLevel) {
    logLevel = level
}

const levels = ['debug', 'info', 'warn', 'error']
export function isEnabled(level: typeof logLevel) {
    return levels.indexOf(level) >= levels.indexOf(logLevel)
}