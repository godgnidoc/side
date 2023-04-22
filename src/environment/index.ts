import * as yaml from 'js-yaml'
import { readFileSync } from 'fs'
import { join } from 'path'
import { projectMeta, projectName, projectPath, rpaths, sideHome } from './constants'
import { inflate, inflateExports } from './inflate'
import { userInfo } from 'os'
import { FinalSettings, LocalSettings, GlobalSettings } from './settings'

export * from './constants'
export * from './inflate'
export * from './logging'
export * from './options'
export * from './settings'

inflateExports({
    LANG: 'C.UTF-8',
    LANGUAGE: 'C.UTF-8',
    SIDE_PROJECT_NAME: projectName,
    NODE_PATH: [
        '/usr/lib/node_modules',
        join(sideHome, rpaths.sideSysroot, 'lib', 'node_modules'),
        join(sideHome, rpaths.sideSysroot, 'usr', 'lib', 'node_modules'),
        projectPath ? join(projectPath, rpaths.projectSysroot, 'lib', 'node_modules') : undefined,
        projectPath ? join(projectPath, rpaths.projectSysroot, 'usr', 'lib', 'node_modules') : undefined,
    ],
    LD_LIBRARY_PATH: [
        join(sideHome, rpaths.sideSysroot, 'lib64'),
        join(sideHome, rpaths.sideSysroot, 'lib'),
        join(sideHome, rpaths.sideSysroot, 'lib', 'x86_64-linux-gnu'),
        join(sideHome, rpaths.sideSysroot, 'usr', 'lib64'),
        join(sideHome, rpaths.sideSysroot, 'usr', 'lib'),
        join(sideHome, rpaths.sideSysroot, 'usr', 'lib', 'x86_64-linux-gnu'),
        projectPath ? join(projectPath, rpaths.projectSysroot, 'lib64') : undefined,
        projectPath ? join(projectPath, rpaths.projectSysroot, 'lib') : undefined,
        projectPath ? join(projectPath, rpaths.projectSysroot, 'lib', 'x86_64-linux-gnu') : undefined,
        projectPath ? join(projectPath, rpaths.projectSysroot, 'usr', 'lib64') : undefined,
        projectPath ? join(projectPath, rpaths.projectSysroot, 'usr', 'lib') : undefined,
        projectPath ? join(projectPath, rpaths.projectSysroot, 'usr', 'lib', 'x86_64-linux-gnu') : undefined,
    ],
    PATH: [
        join(sideHome, rpaths.sideSysroot, 'bin'),
        join(sideHome, rpaths.sideSysroot, 'sbin'),
        join(sideHome, rpaths.sideSysroot, 'usr', 'bin'),
        join(sideHome, rpaths.sideSysroot, 'usr', 'sbin'),
        projectPath ? join(projectPath, rpaths.projectSysroot, 'bin') : undefined,
        projectPath ? join(projectPath, rpaths.projectSysroot, 'sbin') : undefined,
        projectPath ? join(projectPath, rpaths.projectSysroot, 'usr', 'bin') : undefined,
        projectPath ? join(projectPath, rpaths.projectSysroot, 'usr', 'sbin') : undefined,
    ]
}, process.env)

/** 导入全局设置并将内容充入环境变量 */
export const globalSettings = (() => {
    try {
        const settings = yaml.load(readFileSync(join(sideHome, 'settings'), 'utf-8')) as GlobalSettings
        return settings
    } catch (e) {
        console.verbose('failed to inflate root settings: %s', e.message)
        return undefined
    }
})();

/** 导入局部设置并将内容冲入环境变量 */
export const projectSettings = (() => {
    try {
        const settings = yaml.load(readFileSync(join(projectMeta, 'settings'), 'utf-8')) as LocalSettings
        return settings
    } catch (e) {
        console.verbose('failed to inflate project settings: %s', e.message)
        return undefined
    }
})();

/** 导出汇总设置 */
export const settings = new class implements FinalSettings {
    readonly $structure = 'side.final-settings'

    /** 是否显示详细信息 */
    get verbose() { return process.env["SIDE_VERBOSE"] === "TRUE" }

    readonly dir = {
        module: 'module',
        build: 'build',
        document: 'doc',
        generated: join(rpaths.projectMeta, 'generated'),
        package: join(rpaths.projectMeta, 'packing'),
        release: 'release',

        ...globalSettings?.dir
    }

    readonly dist = {
        apiBaseUrl: 'https://localhost:5000/api/dist',
        ftpBaseUrl: 'ftp://localhost',
        user: userInfo().username,
        token: undefined,

        ...globalSettings?.dist,
        ...projectSettings?.dist
    }

    modules = projectSettings?.modules
}

/** 将汇总设置导出至环境变量 */
inflate(settings, process.env)