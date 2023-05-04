import { join, relative } from "path"
import { satisfies, validRange } from "semver"
import { readdir } from "fs/promises"
import { PATH_REPOSITORIES } from "environment"
import { PackageId } from "format"


// 用于记录正在处理的包，防止重复处理
export const busy_packages = new Set<string>()

/**
 * 根据包路径获取包的唯一标识
 * @param path 包路径，绝对路径
 */
export function IdentifyPackage(path: string) {
    const rpath = relative(PATH_REPOSITORIES, path)
    if (rpath.startsWith('..')) {
        return new Error('invalid package path: ' + path)
    }
    const frags = rpath.split('/')
    if (frags.length != 3) return new Error('invalid package path: ' + path)
    const scope = frags[0]
    const symbol = frags.pop()!

    return PackageId.Parse(scope + '/' + symbol)
}

/**
 * 根据包请求获取全部匹配的包唯一标识，如果指定了版本号则只返回匹配版本号的包
 * @param query 包请求，包请求格式于包唯一标识格式相似，包请求不携带版本号及后续内容
 * @return 匹配的包唯一标识列表，按版本号降序排列
 */
export async function QueryPackages(query: string, version?: string) {
    const range = version ? validRange(version) : undefined

    const path = join(PATH_REPOSITORIES, query.split('--')[0])
    if (relative(PATH_REPOSITORIES, path).startsWith('..')) return []

    const packages: PackageId[] = []
    for (const entry of await readdir(path, { withFileTypes: true })) {
        if (!entry.isFile()) continue

        const id = IdentifyPackage(join(path, entry.name))
        if (id instanceof PackageId && id.matchQuery(query)) {
            if (range && !satisfies(id.version, range)) continue
            packages.push(id)
        }
    }

    // 按版本号降序排列
    return packages.sort((a, b) => b.version.compare(a.version))
}