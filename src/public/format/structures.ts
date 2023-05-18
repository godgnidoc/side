/**
 * 用户信息
 * @schema UserInfo
 */
export interface UserInfo {
    name: string
    email: string
    blocked?: boolean
}

/**
 * 仓库清单
 * @schema RepoManifest
 */
export interface RepoManifest {
    contributors: string[]
}

/** 
 * 包打包配置 
 * @schema PackingManifest
 */
export interface PackingManifest {
    packing: {
        /** 发布目的包仓id */
        repo: string

        /** 可选的，包标签序列 */
        tags?: string[]

        /** 可选的，包依赖项 query->version(range) */
        depends?: { [query: string]: string }

        /** 可选的，包部署策略 */
        deploy?: {
            /** 自动部署策略默认为none */
            strategy?: 'none' | 'slink' | 'hlink' | 'copy'

            /** 自动部署时应当排除的路径，这些路径是相对于 SIDE_DIST_ROOT 路径的相对路径。 */
            excludes?: string[]

            /** 自动部署时应当包含的路径，这些路径是相对于 SIDE_DIST_ROOT 路径的相对路径。 */
            includes?: string[]
        }

        /** 可选的，包钩子脚本 */
        hooks?: {

            /** 可选的，包安装钩子脚本 */
            install?: string

            /** 可选的，包激活钩子脚本 */
            activate?: string

            /** 可选的，包测试钩子脚本 */
            test?: string

            /** 可选的，包停用钩子脚本 */
            deactivate?: string

            /** 可选的，包卸载钩子脚本 */
            uninstall?: string
        }

        /** 可选的，资源根相关设置 */
        root?: {
            /** 可选的，指定是否压缩根路经 */
            compress?: boolean

            /** 可选的，指定打包时仅携带的资源 */
            includes?: string[]

            /** 可选的，指定打包时排除的资源 */
            excludes?: string[]
        }

        /** 可选的，包文档相关设置 */
        docs?: {
            /** 可选的，指定是否压缩文档 */
            includes?: string[]

            /** 可选的，指定打包时排除的文档 */
            excludes?: string[]
        }
    }
}

/**
 * 包描述文件
 * @schema PackageManifest
 */
export interface PackageManifest {
    /** 建包时使用的 dist 版本 */
    engine: string

    /** 包唯一标识符 */
    packageId: string

    /** 建包用户 */
    createUser: string

    /** 建包时间 */
    createTime: string

    /** 包依赖列表 query->version */
    depends: { [query: string]: string }

    /** 部署策略 */
    deploy: {
        /**
         * 自动部署资源的策略，可以简省钩子脚本
         * None 表示不会进行任何自动部署
         * Slink 表示将内容根路径下所有文件按原路径结构软链接到 SIDE_PROJECT/PROJECT.RPATH.SYSROOT 路径下
         * Hlink 表示将内容跟路径下所有文件按原路径结构硬链接到 SIDE_PROJECT/PROJECT.RPATH.SYSROOT 路径下
         * Copy 表示将内容跟路径下所有文件按原路径结构拷贝到 SIDE_PROJECT/PROJECT.RPATH.SYSROOT 路径下
         * 不填写默认为 none
         */
        strategy?: 'none' | 'slink' | 'hlink' | 'copy'

        // 自动部署时应当排除的路径，这些路径是相对于 SIDE_DIST_ROOT 路径的相对路径。
        excludes?: string[]

        // 自动部署时应当包含的路径，这些路径是相对于 SIDE_DIST_ROOT 路径的相对路径。
        // 此选项与deploy.excludes冲突，若指定此选项，则不在deploy.includes列表内的路径将被忽略。
        includes?: string[]
    }

}