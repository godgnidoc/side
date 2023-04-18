/** 全局日志严重性阀门 */
let log_level: 'debug' | 'info' | 'warn' | 'error' = 'info'

/** 将控制台打印函数均替换为带时间戳、严重性和颜色的打印函数 */
for (const key of ['debug', 'info', 'warn', 'error']) {

    const func = console[key];
    console[key] = function (fmt: string, ...args: any[]) {
        const sev: typeof log_level = key as typeof log_level
        if (is_enabled(sev)) {
            func(upgrade_format(fmt, sev), ...args);
        }
    };
}

export function GetLogLevel() {
    return log_level;
}

export function SetLogLevel(level: typeof log_level) {
    log_level = level;
}

function is_enabled(level: typeof log_level) {
    const levels = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(log_level);
}

function upgrade_format(format: string, sev: typeof log_level) {
    let severity = sev.toUpperCase()
    if (process.stdout.isTTY) {
        switch (sev) {
            case 'debug':
                severity = '\x1b[1;30mDEBUG\x1b[0m';
                break;
            case 'info':
                severity = '\x1b[1;34mINFO\x1b[0m';
                break;
            case 'warn':
                severity = '\x1b[1;35mWARN\x1b[0m';
                break;
            case 'error':
                severity = '\x1b[1;31mERROR\x1b[0m';
                break;
        }
    }

    return '[' + now() + '] [' + severity + '] ' + format.replace(/%([a-zA-Z])/g, (match, p1) => {
        if (p1 != '%') {
            if (process.stdout.isTTY) {
                return '\x1b[1;36m' + match + '\x1b[0m';
            } else {
                return match;
            }
        } else {
            return match;
        }
    });
}

function now() {
    const date = new Date();
    return date.toLocaleString();
}