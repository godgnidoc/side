import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { homedir, userInfo } from 'os'
import { FileDB, GlobalSettings } from 'format'
import { Args, Brief, Feature, LongOpt } from '@godgnidoc/decli'

class GlobalOptions {
    /** 日志等级 */
    @LongOpt('--logging')
    @Brief('The logging level (default: info)')
    @Args(['debug', 'info', 'warn', 'error'])
        logging: 'debug' | 'info' | 'warn' | 'error' = 'info'
}

export const SidePlatform = new class {
    readonly options = new GlobalOptions

    /** 路径集 */
    readonly paths = new class {
        /** side home的默认绝对路径 */
        readonly DEFAULT_HOME = join(homedir(), '.side')

        /** side home的绝对路径 */
        get home() { return process.env['SIDE_HOME'] || this.DEFAULT_HOME }

        /** 绝对路径，模拟side运行时环境所需的系统结构 */
        get sysroot() { return join(this.home, 'sysroot') }

        /** 绝对路径，存储 dist 下载的资源包 */
        get caches() { return join(this.home, 'caches') }

        /** 绝对路径，全局设置文件 */
        get settings() { return join(this.home, 'settings') }
    }

    readonly server = new class {
        get path() { return homedir() }
        get contributors() { return join(this.path, 'contributors') }
        get repositories() { return join(this.path, 'repositories') }
    }


    /** Side 应用版本号 */
    get version() { return this.manifest.version }

    /** Side 应用修订号 */
    get revision() { return this.manifest.revision }

    /** Side 应用清单 */
    get manifest() {
        const dir = dirname(new URL(import.meta.url).pathname)
        return JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
    }

    /** Side 全局设置 */
    get settings() {
        const ph = {
            dist: {
                apiBaseUrl: 'http://localhost:5000/api',
                ftpBaseUrl: 'ftp://localhost/dist',
                user: userInfo().username,
                token: undefined,
            }
        }
        try {
            return FileDB.Open<GlobalSettings>(this.paths.settings, {
                format: 'yaml',
                schema: 'GlobalSettings',
                placeholder: ph
            })
        } catch (e) {
            console.verbose('failed to load root settings: %s', e.message)
            return ph
        }
    }

    /** 基于当前环境默认需要导出的内容 */
    get exports() {
        return {
            LANG: 'C.UTF-8',
            LANGUAGE: 'C.UTF-8',
            SIDE_HOME: this.paths.home,
            SIDE_VERSION: this.version,
            SIDE_REVISION: this.revision,
            NODE_PATH: [
                '/usr/lib/node_modules',
                join(this.paths.sysroot, 'lib', 'node_modules'),
                join(this.paths.sysroot, 'usr', 'lib', 'node_modules'),
            ],
            LD_LIBRARY_PATH: [
                join(this.paths.sysroot, 'lib64'),
                join(this.paths.sysroot, 'lib'),
                join(this.paths.sysroot, 'lib', 'x86_64-linux-gnu'),
                join(this.paths.sysroot, 'usr', 'lib64'),
                join(this.paths.sysroot, 'usr', 'lib'),
                join(this.paths.sysroot, 'usr', 'lib', 'x86_64-linux-gnu'),
            ],
            PATH: [
                join(this.paths.sysroot, 'bin'),
                join(this.paths.sysroot, 'sbin'),
                join(this.paths.sysroot, 'usr', 'bin'),
                join(this.paths.sysroot, 'usr', 'sbin'),
            ]
        }
    }

    readonly featureVersion = new class extends Feature {
        brief = 'Show version information'
        description = 'Show version information'
        entry() {
            console.log(`side - ${SidePlatform.version} - ${SidePlatform.revision}`)
            return 0
        }
    }
}