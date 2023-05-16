import { Exports, ProjectBuildInfo, ProjectFinalTarget, ProjectManifest } from 'format'

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
    value.replace(/(?<![\\$])\${(\w+)}/g, (_, key) => {
        return env[key]?.toString() || ''
    }).replace(/\\\$|\$\$/g, '$')
}

export function inflate(exports: Exports, env?: Environment): NodeJS.ProcessEnv {
    if (!env) env = { ...process.env }
    if (!exports) return env as NodeJS.ProcessEnv
    for (const raw_key in exports) {
        const key = evaluate(raw_key, env)

        const target = exports[raw_key]
        if (target === undefined || target === null) {
            delete env[key]
            continue
        }

        if (typeof target === 'string' || typeof target === 'number' || typeof target === 'boolean') {
            env[key] = evaluate(target, env)
            continue
        }

        const value = target instanceof Array
            ? target.filter(v => v !== undefined && v !== null).map(v => evaluate(v, env))
            : typeof target.value === 'string' || typeof target.value === 'number' || typeof target.value === 'boolean'
                ? evaluate(target.value, env)
                : target.value.filter(v => v !== undefined && v !== null).map(v => evaluate(v, env))


        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
            env[key] = value
            continue
        }

        const delimiter = target['delimiter'] ?? ':'
        const override = target['override'] ?? false
        const position = target['position'] ?? 'front'

        if (override || !(key in env)) {
            env[key] = value.join(delimiter)
            continue
        }

        const has = env[key].toString().split(delimiter)
        for (const item of value) {
            if (has.includes(item)) {
                has.splice(has.indexOf(item), 1)
            }
        }

        if (position == 'front') {
            env[key] = `${value.join(delimiter)}${delimiter}${has.join(delimiter)}`
        } else {
            env[key] = `${has.join(delimiter)}${delimiter}${value.join(delimiter)}`
        }
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