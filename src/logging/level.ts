export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

/** 全局日志严重性阀门 */
let log_level: LogLevel = 'info'

export function GetLogLevel() {
    return log_level;
}

export function SetLogLevel(level: typeof log_level) {
    log_level = level;
}

export function isEnabled(level: typeof log_level) {
    const levels = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(log_level);
}