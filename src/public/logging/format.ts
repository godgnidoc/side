import { LogLevel } from './level'

export function upgradeFormat(format: string, sev: LogLevel | 'verbose') {
    if (typeof format !== 'string') return format
    let severity = sev.toUpperCase()
    if (process.stderr.isTTY) {
        switch (sev) {
        case 'debug':
            severity = '\x1b[1;30mDEBUG\x1b[0m'
            break
        case 'info':
            severity = '\x1b[1;34mINFO\x1b[0m'
            break
        case 'warn':
            severity = '\x1b[1;35mWARN\x1b[0m'
            break
        case 'error':
            severity = '\x1b[1;31mERROR\x1b[0m'
            break
        case 'verbose':
            severity = '\x1b[1;30mVERBOSE\x1b[0m'
            break
        }
    }

    return '[' + now() + '] [' + severity + '] ' + format.replace(/%([a-zA-Z])/g, (match, p1) => {
        if (p1 != '%') {
            if (process.stdout.isTTY) {
                return '\x1b[1;36m' + match + '\x1b[0m'
            } else {
                return match
            }
        } else {
            return match
        }
    })
}

function now() {
    const date = new Date()

    const formattedDate = new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    }).formatToParts(date)

    const month = formattedDate.find(part => part.type === 'month').value
    const day = formattedDate.find(part=>part.type === 'day').value
    const year = formattedDate.find(part=>part.type === 'year').value

    const hour = formattedDate.find(part => part.type === 'hour').value
    const minute = formattedDate.find(part => part.type === 'minute').value
    const second = formattedDate.find(part => part.type === 'second').value

    return `${month}. ${day}, ${year} ${hour}:${minute}:${second}`
}