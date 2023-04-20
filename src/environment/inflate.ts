/** 
 * 环境变量表
 * 若值为字符串、数字或布尔值，则默认为覆盖原有变量
 * 若值为数组，则默认为不覆盖原有变量
 */
export interface Exports {
    [key: string]: {
        /** 是否覆盖原有变量，若值为数组，默认为 false 否则强制为 true */
        override?: boolean
        /** 字段分割符，默认为冒号 */
        delimiter?: string
        /** 字段值 */
        value: string | number | boolean | string[]
    } | string | number | boolean | string[]
}

/**
 * 将指定的环境变量导出到一个上下文
 * @param exports 要导出的环境变量
 * @param env 要导出到的上下文，默认为当前进程环境，若指定为 null 则从当前进程环境复制一份
 * @returns 返回导出后的上下文
 */
export function inflate(exports: Exports, env: {[key: string]: string|boolean|number} = process.env) {
    if (!env) env = { ...process.env }
    if( !exports ) return env
    for (const key in exports) {
        const value = exports[key]
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
            env[key] = value.toString()
        } else if (Array.isArray(value)) {
            env[key] = env[key]
                ? env[key] + ':' + value.join(':')
                : value.join(':')
        } else {
            const override = value.override === undefined ? !Array.isArray(value.value) : value.override
            const delimiter = value.delimiter === undefined ? ':' : value.delimiter
            const variable = Array.isArray(value.value) ? value.value.join(delimiter) : value.value
            if (override || !env[key]) {
                env[key] = variable
            } else {
                env[key] = `${env[key]}${delimiter}${variable}`
            }
        }
    }
    return env
}