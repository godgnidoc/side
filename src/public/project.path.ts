import { join } from 'path'

export namespace PROJECT {
    export const RPATH = new class {
        /** 相对于项目路径的元信息路径 */
        readonly META = '.side'

        /** 相对于项目路径的项目清单路径 */
        readonly MANIFEST = join(this.META, 'manifest')

        /** 相对于项目路径的构建目标存储路径 */
        readonly TARGETS = join(this.META, 'targets')

        /** 相对于项目路径的最终构建目标路径 */
        readonly TARGET = join(this.META, '.target')

        /** 相对于项目路径的钩子脚本路径 */
        readonly SCRIPTS = join(this.META, 'scripts')

        /** 相对于项目路径的资源路径 */
        readonly RESOURCES = join(this.META, 'resources')

        /** 相对于项目路径的本地设置路径 */
        readonly SETTINGS = join(this.META, 'settings')

        /** 相对于项目路径的资源包安装根路径 */
        readonly SYSROOT = join(this.META, 'sysroot')

        /** 相对于项目路径的变量导出文件路径 */
        readonly EXPORTS = join(this.SYSROOT, 'exports')
    }

    export const DEFAULT_DIRS = new class {
        readonly MODULE = 'module'
        readonly BUILD = 'build'
        readonly DOCUMENT = 'doc'
        readonly GENERATED = join(PROJECT.RPATH.META, 'generated')
        readonly PACKAGE = join(PROJECT.RPATH.META, 'packing')
        readonly RELEASE = 'release'
    }
}