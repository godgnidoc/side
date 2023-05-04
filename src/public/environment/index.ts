import * as yaml from 'js-yaml'
import { readFileSync } from 'fs'
import { join } from 'path'
import { basicExports, projectManifest, projectMeta, projectPath, rpaths, sideHome } from './constants'
import { userInfo } from 'os'
import { FinalSettings, LocalSettings, GlobalSettings, GlobalOptions, ProjectFinalTarget } from 'format'
import { inflate, inflateExports } from './inflate'

export * from './constants'
export * from './inflate'

/** 导入全局设置并将内容充入环境变量 */
let globalSettings = <GlobalSettings>undefined
export function getGlobalSettings() {
    if (globalSettings === null) return undefined
    if (globalSettings !== undefined) return globalSettings

    try {
        const settings = yaml.load(readFileSync(join(sideHome, 'settings'), 'utf-8')) as GlobalSettings
        return settings
    } catch (e) {
        globalSettings = null
        console.verbose('failed to load root settings: %s', e.message)
        return undefined
    }
}

/** 导入局部设置并将内容冲入环境变量 */
let localSettings = <LocalSettings>undefined
export function getLocalSettings() {
    if (localSettings === null) return undefined
    if (localSettings !== undefined) return localSettings

    try {
        const settings = yaml.load(readFileSync(join(projectMeta, 'settings'), 'utf-8')) as LocalSettings
        return settings
    } catch (e) {
        localSettings = null
        console.verbose('failed to load project settings: %s', e.message)
        return undefined
    }
}

/** 导出汇总设置 */
let finalSettings = <FinalSettings>undefined
export function getFinalSettings() {
    if (finalSettings !== undefined) return finalSettings
    const global = getGlobalSettings()
    const local = getLocalSettings()
    return finalSettings = new class implements FinalSettings {
        readonly $structure = 'side.final-settings'

        readonly dist = {
            apiBaseUrl: 'http://localhost:5000/api',
            ftpBaseUrl: 'ftp://localhost/dist',
            user: userInfo().username,
            token: undefined,

            ...global?.dist,
            ...local?.dist
        }

        modules = local?.modules
    }
}

/** 每次都加载最新的目标 */
export function loadFinalTarget() {
    try {
        const source = readFileSync(join(projectPath, rpaths.projectFinalTarget), 'utf-8')
        const target = yaml.load(source) as ProjectFinalTarget
        return target
    } catch (e) {
        console.verbose('failed to load project target: %s', e.message)
        return undefined
    }
}

/** 导出全局选项 */
export const globalOptions = new GlobalOptions

/** 导出一个干净的环境变量备份 */
const envBackup = { ...process.env }
export function getEnvBackup() {
    return { ...envBackup }
}

/** 将全部用于影响当前环境的设置与目标充入环境 */
export function fullyInflateEnv() {
    const env = getEnvBackup()

    /** 将基础环境变量导出至环境变量 */
    inflateExports(basicExports, env)

    /** 将汇总清单设置导出到环境变量 */
    inflate(projectManifest, env)

    /** 将汇总的目标信息导出至环境变量 */
    inflate(loadFinalTarget(), env)

    process.env = env
}