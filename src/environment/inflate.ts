import { projectMeta, projectName, sideHome, sideRevision, sideVersion } from "./constants"
import { projectPath } from "./constants"
import { Exports, ProjectAspect, ProjectBuildInfo, ProjectFinalTarget, ProjectManifest, ProjectTarget } from "../format"
import { GlobalSettings, LocalSettings, FinalSettings } from "../format"


export type Inflatable =
    ProjectManifest | ProjectTarget | ProjectAspect | ProjectFinalTarget
    | ProjectBuildInfo | GlobalSettings | LocalSettings | FinalSettings
type Environment = { [key: string]: string | boolean | number }

export function inflateExports(exports: Exports, env?: Environment) {
    if (!env) env = { ...process.env }
    if (!exports) return env
    for (const key in exports) {
        const value = exports[key]
        if (value === undefined || value === null) {
            delete env[key]
            continue
        }
        
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
            env[key] = value.toString()
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
            env[key] = variable
            continue
        }

        if (override || !env[key]) {
            env[key] = variable.join(delimiter)
            continue
        }

        const has = env[key].toString().split(delimiter)
        const add: string[] = []
        for (const item of variable) {
            if (has.includes(item)) continue
            add.push(item)
        }
        if (add.length) env[key] = `${env[key]}${delimiter}${add.join(delimiter)}`
    }
    return env
}

/**
 * 将指定可充入的内容充入环境
 * @param inf 要导出的可充入内容
 * @param env 要导出到的上下文，默认为当前进程环境，若指定为 null 则从当前进程环境复制一份
 * @returns 返回导出后的上下文
 */
export function inflate(inf: Inflatable, env: Environment = process.env) {
    if (!env) env = { ...process.env }
    if (!inf) return env

    env['SIDE_HOME'] = sideHome
    env['SIDE_VERSION'] = sideVersion
    env['SIDE_REVISION'] = sideRevision
    if (projectPath) env['SIDE_PROJECT'] = projectPath
    if (projectMeta) env['SIDE_PROJECT_META'] = projectMeta
    if (projectName) env['SIDE_PROJECT_NAME'] = projectName

    if (inf.$structure === 'side.manifest') {
        if (inf.project) env['SIDE_PROJECT_NAME'] = inf.project
        if (inf.exports) inflateExports(inf.exports, env)
    }

    if (inf.$structure === 'side.target') {
        if (inf.exports) inflateExports(inf.exports, env)
    }

    if (inf.$structure === 'side.aspect') {
        if (inf.exports) inflateExports(inf.exports, env)
    }

    if (inf.$structure === 'side.final-target') {
        env['SIDE_PROJECT_NAME'] = inf.project
        env['SIDE_TARGET'] = inf.target
        if (inf.exports) inflateExports(inf.exports, env)
    }

    if (inf.$structure === 'side.build-info') {
        env['SIDE_PROJECT_NAME'] = inf.project
        env['SIDE_PROJECT_REVISION'] = inf.revision
        env['SIDE_TARGET'] = inf.target
        // env['SIDE_BUILD_CMD'] = inf.command
        env['SIDE_REQUIRES'] = inf.requires.join(';')

        for (const module in inf.modules) {
            env[`SIDE_MODULE_${module}`] = inf.modules[module]
        }

        for (const resource in inf.resources) {
            const res = inf.resources[resource]
            env[`SIDE_RESOURCE_${resource}`] = res.join(';')
        }

        inflateExports(inf.exports, env)
    }

    if (inf.$structure === 'side.global-settings' || inf.$structure === 'side.final-settings') {
        if (inf.dir) {
            if (inf.dir.module) env['SIDE_DIR_MODULE'] = inf.dir.module
            if (inf.dir.build) env['SIDE_DIR_BUILD'] = inf.dir.build
            if (inf.dir.document) env['SIDE_DIR_DOCUMENT'] = inf.dir.document
            if (inf.dir.generated) env['SIDE_DIR_GENERATED'] = inf.dir.generated
            if (inf.dir.package) env['SIDE_DIR_PACKAGE'] = inf.dir.package
            if (inf.dir.release) env['SIDE_DIR_RELEASE'] = inf.dir.release
        }

        if (inf.dist) {
            if (inf.dist.apiBaseUrl) env['DIST_API_BASE_URL'] = inf.dist.apiBaseUrl
            if (inf.dist.ftpBaseUrl) env['DIST_FTP_BASE_URL'] = inf.dist.ftpBaseUrl
            if (inf.dist.user) env['DIST_USER'] = inf.dist.user
            if (inf.dist.token) env['DIST_TOKEN'] = inf.dist.token
        }
    }

    return env
}