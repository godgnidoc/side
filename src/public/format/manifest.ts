import { Exports } from './exports'

export type Stage = 'draft' | 'ready' | 'built' | 'packaged'

export interface Dirs {
    /** 存放子模块仓库的默认相对路径路径 */
    MODULE?: string

    /** 存放构建内容物的默认相对路径 */
    BUILD?: string

    /** 打包时搜集分发内容的路径 */
    DIST?: string

    /** 存放文档的默认相对路径 */
    DOCUMENT?: string

    /** 存放自动生成的内容的默认相对路径 */
    GENERATED?: string

    /** 打包工作环境的默认相对路径 */
    PACKAGE?: string

    /** 发布包的默认相对存储路径 */
    RELEASE?: string
}

/** 子模块列表 */
export interface SubModules {
    [name: string]: {
        /** 子项目仓库路径 */
        repo?: string

        /** 检出目标分支或TAG */
        checkout?: string

        /** 子项目的参与者邮箱列表 */
        authors?: string[]
    }
}

/** 项目依赖指定表 */
export interface Requires {
    /** 键表示依赖query，值若为字符串则表示依赖版本号 */
    [key: string]: string | {
        /** 依赖版本号 */
        version: string

        /** 依赖条件 */
        condition: string | string[]
    }
}



/** 项目依赖指定表 */
export interface FinalRequires {
    /** 键表示依赖query，值若为字符串则表示依赖版本号 */
    [key: string]: string
}

/** Cascading Resource Manipulating 层叠资源操纵相关配置 */
export interface Resources {
    [category: string]: {
        /** 正在使用的资源域表 */
        using: string[]

        /** 资源部署策略 */
        deploy?: 'slink' | 'copy'

        /** 允许手动指定资源域的查找路径 */
        src?: string

        /** 允许手动指定资源域的部署路径 */
        dst?: string

        /** 部署前是否自动清理部署路径，默认为auto */
        clean?: 'auto' | 'all' | 'never'
    }
}

/**
 * 项目全局清单文件结构
 * @schema ProjectManifest
 */
export interface ProjectManifest {
    /** 项目名称 */
    project?: string

    /** 集成开发环境引擎版本号 */
    engine?: string

    /** 当前项目结构定制 */
    dirs?: Dirs

    /** 当前目标所依赖的包 */
    requires?: Requires

    /** 当前项目的子项目 */
    modules?: SubModules

    /** 层叠资源操纵相关配置 */
    resources?: Resources

    /** 启用目标时应当导出的环境变量定义 */
    exports?: Exports
}

/**
 * 项目目标清单文件结构
 * @schema ProjectTarget
 */
export interface ProjectTarget {
    /** 当前目标所继承的目标的名称 */
    inherit?: string

    /** 当前目标所聚合的切面名称 */
    composites?: string[]

    /** 当前项目结构定制 */
    dirs?: Dirs

    /** 当前目标所依赖的包 */
    requires?: Requires

    /** 当前项目的子项目 */
    modules?: SubModules

    /** 层叠资源操纵相关配置 */
    resources?: Resources

    /** 启用目标时应当导出的环境变量定义 */
    exports?: Exports
}

/**
 * 项目目标切面清单文件结构
 * @schema ProjectAspect
 */
export interface ProjectAspect {
    /** 当前项目结构定制 */
    dirs?: Dirs

    /** 当前目标所依赖的包 */
    requires?: Requires

    /** 当前项目的子项目 */
    modules?: SubModules

    /** 层叠资源操纵相关配置 */
    resources?: Resources

    /** 启用目标时应当导出的环境变量定义 */
    exports?: Exports
}

/**
 * 项目最终目标清单文件结构
 * @schema ProjectFinalTarget
 */
export interface ProjectFinalTarget {
    /** 项目名称 */
    project: string

    /** 项目当前状态 */
    stage: Stage

    /** 当前目标名 */
    target: string

    /** 集成开发环境引擎版本号 */
    engine: string

    /** 当前项目结构定制 */
    dirs?: Dirs

    /** 当前目标依赖的包 */
    requires?: FinalRequires

    /** 当前目标即将获取的子模块 */
    modules?: SubModules

    /** 层叠资源操纵相关配置 */
    resources?: Resources

    /** 启用目标时应当导出的环境变量定义 */
    exports?: Exports
}

/**
 * 构建信息文件结构，每次构建都应该自动生成
 * @schema ProjectBuildInfo
 */
export interface ProjectBuildInfo {
    /** 项目名称 */
    project: string

    /** 当前项目的提交ID，若工作区有内容未提交则以*结尾 */
    revision: string

    /** 当前目标名 */
    target: string

    /** 构建日期 */
    date: string

    /** 集成开发环境引擎版本号 */
    engine: string

    /** 当前目标实际依赖的包ID列表 */
    requires: string[]

    /** 
     * 当前目标已经获取的子模块及构建时的提交ID
     * 若当前工作区有内容未提交，则提交ID以*结尾
     */
    modules: { [repository: string]: string }

    /** 层叠资源操纵相关配置 */
    resources: {
        /** 正在使用的资源域表 */
        [category: string]: string[]
    }

    /** 构建时导出的环境变量 */
    exports: Exports
}