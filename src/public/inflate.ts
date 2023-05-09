import { Exports, ProjectBuildInfo, ProjectFinalTarget, ProjectManifest } from "format"

export type Inflatable = ProjectManifest | ProjectFinalTarget | ProjectBuildInfo
type Environment = { [key: string]: string | boolean | number }

/** 导出一个干净的环境变量备份 */
const envBackup = { ...process.env }
export function getEnvBackup() {
    return { ...envBackup }
}

export function evaluate(value: string | number | boolean, env: Environment) {
    if (typeof value === 'number' || typeof value === 'boolean') return value.toString()

    if (!value.includes('$')) return value
    value.replace(/(?<![\\\$])\${(\w+)}/g, (_, key) => {
        return env[key]?.toString() || ''
    }).replace(/\\\$|\$\$/g, '$')
}

export function inflate(exports: Exports, env?: Environment): NodeJS.ProcessEnv {
    if (!env) env = { ...process.env }
    if (!exports) return env as NodeJS.ProcessEnv
    for (const key in exports) {
        const value = exports[key]
        const ekey = evaluate(key, env)
        if (value === undefined || value === null) {
            delete env[ekey]
            continue
        }

        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
            env[ekey] = evaluate(value, env)
            continue
        }

        const delimiter = Array.isArray(value)
            ? ':'
            : value.delimiter
                ? value.delimiter
                : ':'

        const override = Array.isArray(value)
            ? false
            : Array.isArray(value.value)
                ? value.override
                : true

        const variable = Array.isArray(value)
            ? value.filter(item => item)
            : value.value

        if (!Array.isArray(variable)) {
            env[ekey] = evaluate(variable, env)
            continue
        }

        if (override || !env[ekey]) {
            env[ekey] = variable.map(v => evaluate(v, env)).join(delimiter)
            continue
        }

        const has = env[ekey].toString().split(delimiter)
        const add: string[] = []
        for (const item of variable) {
            if (has.includes(item)) continue
            add.push(item)
        }
        if (add.length) env[ekey] = `${env[ekey]}${delimiter}${add.map(v => evaluate(v, env)).join(delimiter)}`
    }
    return env as NodeJS.ProcessEnv
}

/**
 * 将指定可充入的内容充入环境
 * @param inf 要导出的可充入内容
 * @param env 要导出到的上下文，默认为当前进程环境，若指定为 null 则从当前进程环境复制一份
 * @returns 返回导出后的上下文
 */
// export function inflate(inf: Inflatable, env: Environment = process.env) {
//     if (!env) env = { ...process.env }
//     if (!inf) return env

//     if (inf.$structure === 'side.manifest') {
//         if (inf.project) env['SIDE_PROJECT_NAME'] = inf.project
//         if (inf.dirs) {
//             if (inf.dirs.MODULE) env['SIDE_DIR_MODULE'] = inf.dirs.MODULE
//             if (inf.dirs.BUILD) env['SIDE_DIR_BUILD'] = inf.dirs.BUILD
//             if (inf.dirs.DOCUMENT) env['SIDE_DIR_DOCUMENT'] = inf.dirs.DOCUMENT
//             if (inf.dirs.GENERATED) env['SIDE_DIR_GENERATED'] = inf.dirs.GENERATED
//             if (inf.dirs.PACKAGE) env['SIDE_DIR_PACKAGE'] = inf.dirs.PACKAGE
//             if (inf.dirs.RELEASE) env['SIDE_DIR_RELEASE'] = inf.dirs.RELEASE
//         }
//         if (inf.exports) inflateExports(inf.exports, env)
//     }

//     if (inf.$structure === 'side.final-target') {
//         env['SIDE_PROJECT_NAME'] = inf.project
//         env['SIDE_TARGET'] = inf.target
//         if (inf.exports) inflateExports(inf.exports, env)
//     }

//     if (inf.$structure === 'side.build-info') {
//         env['SIDE_PROJECT_NAME'] = inf.project
//         env['SIDE_PROJECT_REVISION'] = inf.revision
//         env['SIDE_TARGET'] = inf.target
//         // env['SIDE_BUILD_CMD'] = inf.command
//         env['SIDE_REQUIRES'] = inf.requires.join(';')

//         for (const module in inf.modules) {
//             env[`SIDE_MODULE_${module}`] = inf.modules[module]
//         }

//         for (const resource in inf.resources) {
//             const res = inf.resources[resource]
//             env[`SIDE_RESOURCE_${resource}`] = res.join(';')
//         }
//         inflateExports(inf.exports, env)
//     }

//     return env
// }