import { join, relative, resolve } from 'path'
import { SidePlatform } from 'platform'
import { SemVer } from 'semver'

/**
 * 包唯一标识，由域、名称、标签、版本组成，格式为：<scope>/<name>[--<tag>{-<tag>}]-<version>
 * @example '@scope/name--tag-1.2.3-prerelease' 其中域为@scope，名称为name，标签为tag，版本号为1.2.3-prerelease
 * @example 'name-part-one--tag1-tag2-0.0.1' 其中包名为name-part-one，标签为tag1和tag2，版本号为0.0.1
*/
export class PackageId {
    constructor(scope?: string, name = 'package', version: SemVer | string = '0.0.0', tags: string[] = []) {
        if (scope && !this.setScope(scope)) throw new Error('Invalid package scope')
        if (!this.setName(name)) throw new Error('Invalid package name')
        if (!this.setVersion(version)) throw new Error('Invalid package version')
        if (tags && !this.setTags(tags)) throw new Error('Invalid package tags')
    }

    toString() {
        return this.query + '-' + this.version.format()
    }


    get scope(): string {
        return this._scope
    }

    /**
     * 设置域
     * @param value 域名
     * @returns 设置成功返回true，否则返回false
     */
    setScope(value: string) {
        if (!IsValidScope(value)) return false
        this._scope = value
        return true
    }

    get name(): string {
        return this._name
    }

    /**
     * 获取包仓库域位置的绝对路径
     */
    get scopePath(): string {
        
        return resolve(join(SidePlatform.server.repositories, this.scope))
    }

    /**
     * 设置包名
     * @param value 包名
     * @returns 设置成功返回true，否则返回false
     */
    setName(value: string) {
        if (!IsValidName(value)) return false
        this._name = value
        return true
    }

    get tags(): string[] {
        return [...this._tags]
    }

    /**
     * 设置标签
     * @param value 标签数组
     * @returns 设置成功返回true，否则返回false
     */
    setTags(value: string[]) {
        if (undefined === value) {
            this._tags = []
            return true
        }
        for (const tag of value)
            if (!IsValidTag(tag)) return false
        this._tags = [...value]
        return true
    }

    get version(): SemVer {
        return this._ver
    }

    /**
     * 设置版本号
     * @param value 版本号，可以为字符串或SemVer对象
     * @returns 设置成功返回true，否则返回false
     */
    setVersion(value: SemVer | string) {
        if (typeof value == 'string') {
            try {
                value = new SemVer(value)
            } catch {
                return false
            }
        }
        this._ver = value
        return true
    }

    /**
     * 包请求，格式为：<scope>/<name>[--<tag>{-<tag>}]，不携带版本号及后续内容
     */
    get query(): string {
        return this.scope + '/' + this.name + (this.tags.length ? '--' + this.tags.join('-') : '')
    }

    /**
     * 包仓库ID，格式为：<scope>/<name>
     */
    get repoId(): string {
        return this.scope + '/' + this.name
    }

    /**
     * 获取包仓库位置的绝对路径
     */
    get repoPath(): string {
        return join(this.scopePath, this.name)
    }

    /**
     * 获取包本地仓库位置的绝对路径
     */
    get localRepoPath(): string {
        return resolve(join(SidePlatform.paths.caches, this.repoId))
    }

    /**
     * 获取包存储文件名
     */
    get fileName(): string {
        return this.symbol + '.tar'
    }

    /**
     * 获取包存储位置的绝对路径
     */
    get path(): string {
        return resolve(join(this.repoPath, this.fileName))
    }

    /**
     * 获取包本地存储位置的绝对路径
     */
    get localPath(): string {
        return resolve(join(this.localRepoPath, this.fileName))
    }

    /**
     * 获取包的清单存储路径
     */
    get manifestPath(): string {
        return resolve(join(this.repoPath, this.symbol + '.manifest'))
    }

    get dist() {
        return {
            SIDE_DIST_PATH: resolve(join(this.localRepoPath, this.symbol)),
            SIDE_DIST_ROOT: resolve(join(this.localRepoPath, this.symbol, 'root')),
            SIDE_DIS_NAME: this.name,
            SIDE_DIST_TAGS: this.tags.join('-'),
            SIDE_DIST_VERSION: this.version.format(),
            SIDE_DIST_MAJOR: this.version.major,
            SIDE_DIST_MINOR: this.version.minor,
            SIDE_DIST_PATCH: this.version.patch,
            SIDE_DIST_QUERY: this.query,
            SIDE_DIST_SYMBOL: this.symbol,
            SIDE_DIST_SCOPE: this.scope,
            SIDE_DIST_ID: this.toString()
        }
    }

    /**
     * 设置请求文本
     * @param value 请求文本
     * @returns 设置是否成功
     */
    setQuery(value: string) {
        const part = PackageId.FromQuery(value)

        if (part instanceof Error) return false

        this._name = part.name
        this._tags = part.tags
        this._scope = part.scope

        return true
    }

    /**
     * 包符号，格式为：<name>[--<tag>{-<tag>}]-<version>，不携带域名
     */
    get symbol(): string {
        return this.name + (this.tags.length ? '--' + this.tags.join('-') : '') + '-' + this.version.format()
    }

    /**
     * 设置包符号
     * @param value 包符号
     * @returns 设置是否成功
     */
    setSymbol(value: string) {
        const part = PackageId.FromString(value)
        if (part instanceof Error) return false

        this._name = part.name
        this._tags = part.tags
        this._ver = part.version

        return true
    }

    /**
     * 包名，必须满足基本命名规范
     * 正则表达式：/^[a-zA-Z]+(?:-[a-zA-Z0-9_]+)*$/
     */
    private _name: string

    /**
     * 标签，可省略，多个标签之间用-连接，单个标签只能由字母、数字、下划线组成，且不能以数字开头
     * 单个标签正则表达式：/^[a-zA-Z][a-zA-Z0-9_]*$/
     */
    private _tags: string[]

    /**
     * 版本号，必须满足语义化版本规范
     * 语义化版本规范：https://semver.org/lang/zh-CN/
     */
    private _ver: SemVer

    /** 
     * 域名，不可省略
     * 域名必须由@开头，其余部分必须满足基本命名规范
     * 正则表达式：/^@[a-zA-Z]+(?:-[a-zA-Z0-9_]+)*$/
     */
    private _scope: string

    /**
     * 从字符串解析出包唯一标识
     * @param id 包请求
     * @returns 包唯一标识对象
     */
    static FromString(id: string): PackageId | Error {
        const match = id.match(/^(@[a-zA-Z0-9][a-zA-Z0-9_]*(?:-[a-zA-Z0-9][a-zA-Z0-9_]*)*)\/([a-zA-Z0-9][a-zA-Z0-9_]*(?:-[a-zA-Z0-9][a-zA-Z0-9_]*)*)(?:--([a-zA-Z0-9][a-zA-Z0-9_]*(?:-[a-zA-Z0-9][a-zA-Z0-9_]*)*))?-((?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*)?(?:\+[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*)?)$/)

        if (!match) return new Error('Invalid package id: ' + id)

        const scope = match[1]
        const name = match[2]
        const tags = match[3] ? match[3].split('-') : []
        const version = match[4]

        return new PackageId(scope, name, version, tags)
    }

    /**
     * 从字符串解析出包唯一标识
     * @param query 包请求
     * @param version 版本号
     * @returns 包唯一标识对象
     */
    static FromQuery(query: string, version = '0.0.0'): PackageId | Error {
        return PackageId.FromString(query + '-' + version)
    }

    static FromRepoId(reqoId: string, version = '0.0.0', tags: string[] = []): PackageId | Error {
        if (tags.length) return PackageId.FromString(reqoId + '--' + tags.join('-') + '-' + version)
        else return PackageId.FromString(reqoId + '-' + version)
    }

    static FromScopeAndName(scope: string, name: string, version = '0.0.0', tags: string[] = []): PackageId | Error {
        if (tags.length) return PackageId.FromString(scope + '/' + name + '--' + tags.join('-') + '-' + version)
        else return PackageId.FromString(scope + '/' + name + '-' + version)
    }

    static FromPath(path: string): PackageId | Error {
        const rpath = relative(SidePlatform.server.repositories, path)
        if (rpath.startsWith('..') || !rpath.endsWith('.tar')) {
            return new Error('invalid package path: ' + path)
        }
        const frags = rpath.slice(0, rpath.length - 4).split('/')
        if (frags.length != 3) return new Error('invalid package path: ' + path)
        const scope = frags[0]
        const symbol = frags.pop()

        return PackageId.FromString(scope + '/' + symbol)
    }
}

/**
 * 检查域是否满足基本命名规范
 */
export function IsValidScope(scope: string): boolean {
    return /^@[a-zA-Z0-9][a-zA-Z0-9_]*(?:-[a-zA-Z0-9][a-zA-Z0-9_]*)*$/.test(scope)
}

/**
 * 检查名称是否满足基本命名规范
 */
export function IsValidName(name: string): boolean {
    return /^[a-zA-Z0-9][a-zA-Z0-9_]*(?:-[a-zA-Z0-9][a-zA-Z0-9_]*)*$/.test(name)
}

/**
 * 检查标签是否满足基本命名规范
 * @param tag 标签
 * @returns 是否满足基本命名规范
 */
export function IsValidTag(tag: string): boolean {
    return /^[a-zA-Z0-9][a-zA-Z0-9_]*$/.test(tag)
}

/**
 * 检查标签数组是否满足基本命名规范
 * @param tags 标签数组
 * @returns 是否满足基本命名规范
 */
export function IsValidTags(tags: string[]): boolean {
    if (tags.length == 0) return true
    return tags.every(tag => IsValidTag(tag))
}



/**
 * 获取最新版本的包唯一标识
 * @param packages 包唯一标识数组
 * @param sorted 是否已经降序排序
 * @returns 最新版本的包唯一标识，如果没有匹配的包则返回undefined
 */
export function LatestPackageId(packages: PackageId[], sorted = false) {
    if (!packages.length) return undefined

    if (!sorted) packages.sort((a, b) => b.version.compare(a.version))

    return packages[0]
}