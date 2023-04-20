import { Args, Brief, LongOpt } from "@godgnidoc/decli"
import { readFileSync } from "fs"
import { statSync } from "fs"
import { load } from "js-yaml"
import { homedir } from "os"
import { join, resolve } from "path"
import { Exports, inflate } from "./inflate"
import { ProjectManifest } from "../manifest"

function locateWorkspace() {
    let dir = process.cwd()
    while (dir !== '/') {
        if (statSync(join(dir, '.project'), { throwIfNoEntry: false })?.isDirectory())
            return dir
        dir = resolve(dir, '..')
    }
    return process.cwd()
}

function locateSideRoot() {
    return process.env["SIDE_ROOT"] || join(homedir(), '.side')
}

class Settings {

    /** side根路径 */
    readonly root = root

    /** 工作路径 */
    readonly workspace: string = locateWorkspace()

    /** 元信息存储路径 */
    readonly meta = join(this.workspace, '.project')

    /** 是否显示详细信息 */
    readonly verbose = process.env["SIDE_VERBOSE"] === "TRUE" || false

    /** 日志等级 */
    @LongOpt('--logging')
    @Brief('The logging level (default: info)')
    @Args(['debug', 'info', 'warn', 'error'])
    logging: 'debug' | 'info' | 'warn' | 'error' = this.verbose ? 'debug' : 'info'

    /** side运行过程中可能用到的路径变量，这些变量均相对于workspace */
    dir = {
        get module() { return process.env["SIDE_DIR_MODULE"] || 'module' },
        get library() { return process.env["SIDE_DIR_LIBRARY"] || 'lib' },
        get build() { return process.env["SIDE_DIR_BUILD"] || 'build' },
        get document() { return process.env["SIDE_DIR_DOCUMENT"] || 'doc' },
        get generated() { return process.env["SIDE_DIR_GENERATED"] || 'generated' },
        get source() { return process.env["SIDE_DIR_SOURCE"] || 'src' },
        get include() { return process.env["SIDE_DIR_INCLUDE"] || 'include' },
        get test() { return process.env["SIDE_DIR_TEST"] || 'test' },
        get package() { return process.env["SIDE_DIR_PACKAGE"] || 'package' },
        get release() { return process.env["SIDE_DIR_RELEASE"] || 'release' },
    }

    ftp = {
        user: process.env["SIDE_FTP_USER"] || 'anonymous',
        password: process.env["SIDE_FTP_PASSWORD"] || 'anonymous',
        host: process.env["SIDE_FTP_HOST"] || 'localhost',
    }

    dist = {

    }
}

/** 将全局设置与局部设置充入当前环境 */
const root = locateSideRoot()
try {
    const root_settings = load(readFileSync(join(root, 'settings'), 'utf-8')) as Exports
    inflate(root_settings)
} catch(e) {
    console.verbose('failed to inflate root settings: %s', e.message)
}

const workspace = locateWorkspace()
try {
    const workspace_settings = load(readFileSync(join(workspace, '.target'), 'utf-8')) as Exports
    inflate(workspace_settings)
} catch(e) {
    console.verbose('failed to inflate workspace settings from target: %s', e.message)
    try {
        console.verbose('trying to inflate workspace settings from manifest')
        const workspace_settings = load(readFileSync(join(workspace, '.project', 'manifest'), 'utf-8')) as ProjectManifest
        inflate(workspace_settings.exports)
    } catch(e) {
        console.verbose('failed to inflate workspace settings from manifest: %s', e.message)
    }
}

export const settings = new Settings