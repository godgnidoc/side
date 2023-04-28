import { SemVer } from "semver"
import { PackageId } from "./naming"

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

export class PackageManifest {
    /** 建包时使用的 dist 版本 */
    distVersion: SemVer

    /** 包唯一标识符 */
    packageId: PackageId

    /** 建包用户 */
    createUser: string

    /** 建包时间 */
    createTime: Date

    /** 包依赖列表 query->version */
    depends: { [query: string]: SemVer }

    /** 执行钩子脚本时可设置的环境变量 key->value @TODO 支持变量演算 */
    variables: { [key: string]: string }

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
        strategy: 'none' | 'slink' | 'hlink' | 'copy'

        // 自动部署时应当排除的路径，这些路径是相对于 MV_DIST_ROOT 路径的相对路径。
        excludes?: string[]

        // 自动部署时应当包含的路径，这些路径是相对于 MV_DIST_ROOT 路径的相对路径。
        // 此选项与deploy.excludes冲突，若指定此选项，则不在deploy.includes列表内的路径将被忽略。
        includes?: string[]
    }

    // 是否在集成开发环境删除 MV_LOCAL_ROOT 路径前需要提前执行灭活操作。
    // 默认为 false，表示清理阶段不进行灭活操作
    deactivateOnClean: boolean

    private constructor() { }

    /** 将包描述文件解析为对象 */
    static Parse(value: any) {
        if (typeof value != 'object') return new Error('invalid manifest format')

        const manifest = new PackageManifest()

        try {
            manifest.distVersion = new SemVer(value['dist-version'])
        } catch {
            return new Error('invalid dist-version format')
        }

        const packageId = PackageId.Parse(value['package-id'])
        if (packageId instanceof Error) return packageId
        manifest.packageId = packageId

        if (value.name !== packageId.name) return new Error('package name mismatch')
        if (value.tags !== packageId.tags.join('-')) return new Error('package tags mismatch')
        if (value.version !== packageId.version.toString()) return new Error('package version mismatch')
        if (value.scope !== packageId.scope) return new Error('package scope mismatch')

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

        manifest.variables = {}
        if (typeof value.variables === 'object') {
            for (const key in value.variables) {
                if (typeof value.variables[key] != 'string') return new Error(`invalid variables ${key} format`)
                manifest.variables[key] = value.variables[key]
            }
        }

        manifest.deploy = { strategy: 'none' }
        if (typeof value.deploy === 'object') {
            if (typeof value.deploy.strategy != 'string') return new Error('invalid deploy.strategy format')
            if (value.deploy.strategy !== 'none' && value.deploy.strategy !== 'slink' && value.deploy.strategy !== 'hlink' && value.deploy.strategy !== 'copy') return new Error('invalid deploy.strategy format')
            manifest.deploy.strategy = value.deploy.strategy

            if (Array.isArray(value.deploy.excludes)) {
                manifest.deploy.excludes = value.deploy.excludes
            }

            if (Array.isArray(value.deploy.includes)) {
                manifest.deploy.includes = value.deploy.includes
            }

            if (manifest.deploy.excludes && manifest.deploy.includes) return new Error('deploy.excludes and deploy.includes are conflict')
        }

        manifest.deactivateOnClean = false
        if (typeof value['deactivate-on-clean'] === 'boolean')
            manifest.deactivateOnClean = value['deactivate-on-clean']

        return manifest
    }

    toJson() {
        const value = {
            'dist-version': this.distVersion.toString(),
            'package-id': this.packageId.toString(),
            'create-user': this.createUser,
            'create-time': this.createTime.toISOString(),
            depends: this.depends,
            variables: this.variables,
            deploy: this.deploy,
            'deactivate-on-clean': this.deactivateOnClean
        }

        return value
    }
}