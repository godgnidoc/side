import * as yaml from 'js-yaml'
import { readFileSync } from 'fs'
import { join } from 'path'
import { projectMeta, projectPath, rpaths, sideHome } from './constants'
import { userInfo } from 'os'
import { FinalSettings, LocalSettings, GlobalSettings, GlobalOptions, ProjectFinalTarget } from '../format'

export * from './constants'
export * from './inflate'

/** 导入全局设置并将内容充入环境变量 */
let globalSettings = undefined
export function getGlobalSettings() {
    if( globalSettings === null ) return undefined
    if( globalSettings !== undefined ) return globalSettings

    try {
        const settings = yaml.load(readFileSync(join(sideHome, 'settings'), 'utf-8')) as GlobalSettings
        return settings
    } catch (e) {
        globalSettings = null
        console.verbose('failed to inflate root settings: %s', e.message)
        return undefined
    }
}

/** 导入局部设置并将内容冲入环境变量 */
let localSettings = undefined
export function getLocalSettings () {
    if( localSettings === null ) return undefined
    if( localSettings !== undefined ) return localSettings

    try {
        const settings = yaml.load(readFileSync(join(projectMeta, 'settings'), 'utf-8')) as LocalSettings
        return settings
    } catch (e) {
        localSettings = null
        console.verbose('failed to inflate project settings: %s', e.message)
        return undefined
    }
}

/** 导出汇总设置 */
let FinalSettings = undefined
export function getFinalSettings() {
    const global = getGlobalSettings()
    const local = getLocalSettings()
    return new class implements FinalSettings {
        readonly $structure = 'side.final-settings'
    
        readonly dir = {
            module: 'module',
            build: 'build',
            document: 'doc',
            generated: join(rpaths.projectMeta, 'generated'),
            package: join(rpaths.projectMeta, 'packing'),
            release: 'release',
    
            ...global?.dir
        }
    
        readonly dist = {
            apiBaseUrl: 'https://localhost:5000/api/dist',
            ftpBaseUrl: 'ftp://localhost/dist',
            user: userInfo().username,
            token: undefined,
    
            ...global?.dist,
            ...local?.dist
        }
    
        modules = local?.modules
    }
}


let finalTarget: ProjectFinalTarget = undefined
export function getFinalTarget() {
    if( finalTarget === null ) return undefined
    if( finalTarget !== undefined ) return finalTarget

    try {
        const target = yaml.load(readFileSync(join(projectPath, rpaths.projectFinalTarget), 'utf-8')) as ProjectFinalTarget
        return target
    } catch (e) {
        finalTarget = null
        console.verbose('failed to inflate project target: %s', e.message)
        return undefined
    }
}

/** 导出全局选项 */
export const globalOptions = new GlobalOptions