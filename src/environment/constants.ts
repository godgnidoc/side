import { readFileSync, statSync } from "fs"
import { dirname, join, resolve } from "path"
import { Exports, ProjectManifest } from "../format"
import { homedir } from "os"
import { load } from "js-yaml"

/** 定义固化的相对路径 */
export const rpaths = new class {
    /** 相对于项目路径的元信息路径 */
    readonly projectMeta = '.project'

    /** 相对于项目路径的项目清单路径 */
    readonly projectManifest = join(this.projectMeta, 'manifest')

    /** 相对于项目路径的构建目标存储路径 */
    readonly projectTargets = join(this.projectMeta, 'targets')

    /** 相对于项目路径的最终构建目标路径 */
    readonly projectFinalTarget = join(this.projectMeta, '.target')

    /** 相对于项目路径的钩子脚本路径 */
    readonly projectScripts = join(this.projectMeta, 'scripts')

    /** 相对于项目路径的资源路径 */
    readonly projectResources = join(this.projectMeta, 'resources')

    /** 相对于项目路径的本地设置路径 */
    readonly localSettings = join(this.projectMeta, 'settings')

    /** 相对于项目路径的资源包安装根路径 */
    readonly projectSysroot = join(this.projectMeta, 'sysroot')

    /** side home的默认绝对路径 */
    readonly defaultSideHome = join(homedir(), '.side')

    /** 相对于side home的路径，存储 dist 下载的资源包 */
    readonly sidePackages = 'packages'

    /** 相对于side home的路径，模拟side运行时环境所需的系统结构 */
    readonly sideSysroot = 'sysroot'

    /** 相对于side home的路径，全局设置文件 */
    readonly sideSettings = 'settings'
}

/** 默认项目路径结构 */
export const defaultDirs = new class {
    readonly module = 'module'
    readonly build = 'build'
    readonly document = 'doc'
    readonly generated = join(rpaths.projectMeta, 'generated')
    readonly package = join(rpaths.projectMeta, 'packing')
    readonly release = 'release'
}

function locateSideHome() {
    return process.env["SIDE_HOME"] || rpaths.defaultSideHome
}

/** Side 应用清单 */
const nodeManifest = (() => {
    let dir = dirname(new URL(import.meta.url).pathname)
    return JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
})()

export const {
    /** 项目清单或undefined */
    projectManifest,

    /** 项目路径或undefined */
    projectPath
} = (() => {
    let dir = process.cwd()
    while (dir !== '/') {
        if (statSync(join(dir, rpaths.projectManifest), { throwIfNoEntry: false })?.isFile()) {
            const file = join(dir, rpaths.projectManifest)
            const source = readFileSync(file, 'utf-8')
            const manifest = load(source) as ProjectManifest
            manifest.dirs = {
                ...defaultDirs,
                ...manifest.dirs
            }
            return { projectManifest: manifest, projectPath: dir }
        }
        dir = resolve(dir, '..')
    }
    return { projectManifest: undefined, projectPath: undefined }
})()

/** Side home实际路径 */
export const sideHome = locateSideHome()

/** Side 应用版本号 */
export const sideVersion = nodeManifest.version

/** Side 应用修订号 */
export const sideRevision = nodeManifest.revision

/** 项目元信息存储路径或 undefined */
export const projectMeta = projectPath ? join(projectPath, rpaths.projectMeta) : undefined

/** 项目名，取manifest.project 或 undefined */
export const projectName = projectManifest?.project

/** 基于当前环境默认需要导出的内容 */
export const basicExports: Exports = {
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
}