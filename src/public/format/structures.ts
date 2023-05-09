import { SemVer, validRange, valid } from "semver"
import { PackageId } from "./naming"
import { IsValidTag } from "./naming"
import { SidePlatform } from "platform"

export class UserInfo {
    name: string
    email: string
    blocked?: boolean

    private constructor() { }

    static Parse(value: any) {
        if (typeof value != 'object') return undefined

        const info = new UserInfo()

        if (typeof value.name != 'string') return undefined
        info.name = value.name

        if (typeof value.email != 'string') return undefined
        info.email = value.email

        if (typeof value.blocked == 'boolean') info.blocked = value.blocked

        return info
    }

    toJson() {
        return { name: this.name, email: this.email, blocked: this.blocked }
    }
}

export class RepoManifest {
    contributors: string[]

    private constructor() { }

    static Parse(value: any) {
        if (typeof value != 'object') return undefined

        const manifest = new RepoManifest()

        if (!Array.isArray(value.contributors)) return undefined
        manifest.contributors = value.contributors

        return manifest
    }
}

/** 包打包配置 */
export class PackingManifest {
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

            /** 自动部署时应当排除的路径，这些路径是相对于 MV_DIST_ROOT 路径的相对路径。 */
            excludes?: string[]

            /** 自动部署时应当包含的路径，这些路径是相对于 MV_DIST_ROOT 路径的相对路径。 */
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

    private constructor() { }

    static Parse(value: any) {
        if (typeof value != 'object') return new Error('invalid packing manifest format')
        const packing = value.packing
        if (typeof packing != 'object') return new Error('invalid packing manifest format')

        // 分析目标包仓格式
        if (typeof packing.repo != 'string') return new Error('target repo id is required')
        const fake_pid = PackageId.Parse(packing.repo, '0.0.0')
        if (fake_pid instanceof Error) return fake_pid
        const repo = fake_pid.repo_id

        // 创建打包配置
        const manifest = new PackingManifest()
        manifest.packing = { repo }

        // 分析标签序列
        if (packing.tags instanceof Array) for (const tag of packing.tags) {
            if (!IsValidTag(tag)) return new Error('invalid tag format')
            if (!manifest.packing.tags) manifest.packing.tags = [tag]
            else manifest.packing.tags.push(tag)
        }

        // 分析依赖项
        if (typeof packing.depends == 'object') {
            manifest.packing.depends = {}
            for (const query in packing.depends) {
                const version = packing.depends[query]
                if (PackageId.Parse(query, '0.0.0') instanceof Error) return new Error('invalid query format: ' + query)
                if (!validRange(version)) return new Error('invalid version format: ' + version)
                manifest.packing.depends[query] = version
            }
        }

        // 分析部署策略
        if (typeof packing.deploy == 'object') {
            if (typeof packing.deploy.strategy != 'string') return new Error('invalid deploy strategy format')
            if (!['none', 'slink', 'hlink', 'copy'].includes(packing.deploy.strategy))
                return new Error('invalid deploy strategy format')
            manifest.packing.deploy = { strategy: packing.deploy.strategy }

            if (packing.deploy.excludes instanceof Array) {
                manifest.packing.deploy.excludes = packing.deploy.excludes
            }

            if (packing.deploy.includes instanceof Array) {
                if (manifest.packing.deploy.excludes) return new Error('deploy includes conflict with deploy excludes')
                manifest.packing.deploy.includes = packing.deploy.includes
            }
        }

        // 分析钩子脚本
        if (typeof packing.hooks == 'object') {
            if (typeof packing.hooks.install == 'string') manifest.packing.hooks = { install: packing.hooks.install }
            if (typeof packing.hooks.activate == 'string') {
                if (manifest.packing.hooks) manifest.packing.hooks.activate = packing.hooks.activate
                else manifest.packing.hooks = { activate: packing.hooks.activate }
            }
            if (typeof packing.hooks.test == 'string') {
                if (manifest.packing.hooks) manifest.packing.hooks.test = packing.hooks.test
                else manifest.packing.hooks = { test: packing.hooks.test }
            }
            if (typeof packing.hooks.deactivate == 'string') {
                if (manifest.packing.hooks) manifest.packing.hooks.deactivate = packing.hooks.deactivate
                else manifest.packing.hooks = { deactivate: packing.hooks.deactivate }
            }
            if (typeof packing.hooks.uninstall == 'string') {
                if (manifest.packing.hooks) manifest.packing.hooks.uninstall = packing.hooks.uninstall
                else manifest.packing.hooks = { uninstall: packing.hooks.uninstall }
            }
        }

        // 分析资源根相关设置
        if (typeof packing.root == 'object') {
            if (typeof packing.root.compress == 'boolean') manifest.packing.root = { compress: packing.root.compress }
            if (packing.root.includes instanceof Array) {
                manifest.packing.root = { includes: packing.root.includes }
            }
            if (packing.root.excludes instanceof Array) {
                if (manifest.packing.root.includes) return new Error('root includes conflict with root excludes')
                manifest.packing.root = { excludes: packing.root.excludes }
            }
        }

        // 分析文档相关设置
        if (typeof packing.docs == 'object') {
            if (packing.docs.includes instanceof Array) {
                manifest.packing.docs = { includes: packing.docs.includes }
            }
            if (packing.docs.excludes instanceof Array) {
                if (manifest.packing.docs.includes) return new Error('docs includes conflict with docs excludes')
                manifest.packing.docs = { excludes: packing.docs.excludes }
            }
        }

        return manifest
    }
}

export class PackageManifest {
    /** 建包时使用的 dist 版本 */
    engine: SemVer

    /** 包唯一标识符 */
    packageId: PackageId

    /** 建包用户 */
    createUser: string

    /** 建包时间 */
    createTime: Date

    /** 包依赖列表 query->version */
    depends: { [query: string]: SemVer }

    /** 部署策略 */
    deploy: {
        /**
         * 自动部署资源的策略，可以简省钩子脚本
         * None 表示不会进行任何自动部署
         * Slink 表示将内容根路径下所有文件按原路径结构软链接到 MV_LOCAL_ROOT 路径下
         * Hlink 表示将内容跟路径下所有文件按原路径结构硬链接到 MV_LOCAL_ROOT 路径下
         * Copy 表示将内容跟路径下所有文件按原路径结构拷贝到 MV_LOCAL_ROOT 路径下
         * 不填写默认为 none
        */
        strategy?: 'none' | 'slink' | 'hlink' | 'copy'

        // 自动部署时应当排除的路径，这些路径是相对于 MV_DIST_ROOT 路径的相对路径。
        excludes?: string[]

        // 自动部署时应当包含的路径，这些路径是相对于 MV_DIST_ROOT 路径的相对路径。
        // 此选项与deploy.excludes冲突，若指定此选项，则不在deploy.includes列表内的路径将被忽略。
        includes?: string[]
    }

    // 是否在集成开发环境删除 MV_LOCAL_ROOT 路径前需要提前执行灭活操作。
    // 默认为 false，表示清理阶段不进行灭活操作
    // deactivateOnClean: boolean

    private constructor() { }

    /** 将包描述文件解析为对象 */
    static Parse(value: any) {
        if (typeof value != 'object') return new Error('invalid manifest format')

        const manifest = new PackageManifest()

        try {
            manifest.engine = new SemVer(value['engine'])
        } catch {
            return new Error('invalid engine format')
        }

        const packageId = PackageId.Parse(value['package-id'])
        if (packageId instanceof Error) return packageId
        manifest.packageId = packageId

        // if (value.name !== packageId.name) return new Error('package name mismatch')
        // if (value.tags !== packageId.tags.join('-')) return new Error('package tags mismatch')
        // if (value.version !== packageId.version.toString()) return new Error('package version mismatch')
        // if (value.scope !== packageId.scope) return new Error('package scope mismatch')

        if (typeof value['create-user'] != 'string') return new Error('invalid create-user format')
        manifest.createUser = value['create-user']

        if (typeof value['create-time'] != 'string') return new Error('invalid create-time format')
        const createTime = new Date(value['create-time'])
        if (isNaN(createTime.getTime())) return new Error('invalid create-time format')
        manifest.createTime = createTime

        manifest.depends = {}
        if (typeof value.depends === 'object') {
            for (const query in value.depends) {
                try {
                    if (PackageId.Parse(query + '-0.0.0') instanceof Error) return new Error(`invalid depends ${query} format`)
                    manifest.depends[query] = new SemVer(value.depends[query])
                } catch {
                    return new Error(`invalid depends ${query} format`)
                }
            }
        }

        manifest.deploy = { strategy: 'none' }
        if (typeof value.deploy === 'object') {
            if (typeof value.deploy.strategy != 'string') return new Error('invalid deploy.strategy format')
            if (!['none', 'slink', 'hlink', 'copy'].includes(value.deploy.strategy)) return new Error('invalid deploy.strategy')
            manifest.deploy.strategy = value.deploy.strategy

            if (Array.isArray(value.deploy.excludes)) {
                manifest.deploy.excludes = value.deploy.excludes
            }

            if (Array.isArray(value.deploy.includes)) {
                manifest.deploy.includes = value.deploy.includes
            }

            if (manifest.deploy.excludes && manifest.deploy.includes) return new Error('deploy.excludes and deploy.includes are conflict')
        }

        // manifest.deactivateOnClean = false
        // if (typeof value['deactivate-on-clean'] === 'boolean')
        //     manifest.deactivateOnClean = value['deactivate-on-clean']

        return manifest
    }

    static Make(packing: PackingManifest['packing'], version: string): PackageManifest | Error {
        if (!valid(version)) return new Error('invalid version format')

        const user = SidePlatform.settings.dist.user
        if (!user) return new Error('please login first')

        const manifest = new PackageManifest()
        manifest.engine = new SemVer(SidePlatform.version)

        manifest.packageId = new PackageId()
        manifest.packageId.setQuery(packing.repo)
        manifest.packageId.setTags(packing.tags)
        manifest.packageId.setVersion(version)

        manifest.createUser = user
        manifest.createTime = new Date()

        if (packing.depends) {
            manifest.depends = {}
            for (const query in packing.depends) {
                manifest.depends[query] = new SemVer(packing.depends[query])
            }
        }

        manifest.deploy = { strategy: 'none' }
        if (packing.deploy) {
            manifest.deploy.strategy = packing.deploy.strategy
            if (packing.deploy.excludes) manifest.deploy.excludes = packing.deploy.excludes
            if (packing.deploy.includes) manifest.deploy.includes = packing.deploy.includes
        }

        // manifest.deactivateOnClean = false

        return manifest
    }

    toJson() {
        const value = {
            'engine': this.engine.toString(),
            'package-id': this.packageId.toString(),
            'create-user': this.createUser,
            'create-time': this.createTime.toISOString(),
            depends: this.depends,
            deploy: this.deploy,
            // 'deactivate-on-clean': this.deactivateOnClean
        }

        return value
    }
}