import { join } from 'path'
import { satisfies, validRange } from 'semver'
import { readdir } from 'fs/promises'
import { PackageId } from 'format'


// 用于记录正在处理的包，防止重复处理
export const busyPackages = new Set<string>()

/**
 * 根据包请求获取全部匹配的包唯一标识，如果指定了版本号则只返回匹配版本号的包
 * @param query 包请求，包请求格式于包唯一标识格式相似，包请求不携带版本号及后续内容
 * @param version 版本号，符合语义化版本规范，支持范围版本号
 * @return 匹配的包唯一标识列表，按版本号降序排列
 */
export async function QueryPackages(query: string, version = '') {
    const range = version ? validRange(version) : ''

    const qid = PackageId.FromQuery(query)
    if (qid instanceof Error) return []
    const repo = qid.repoPath

    const packages: PackageId[] = []
    for (const entry of await readdir(repo, { withFileTypes: true })) {
        if (!entry.isFile()) continue

        const id = PackageId.FromPath(join(repo, entry.name))
        if (!(id instanceof PackageId)) continue
        if (qid.query !== id.query) continue
        if (!satisfies(id.version, range)) continue

        packages.push(id)
    }

    // 按版本号降序排列
    return packages.sort((a, b) => b.version.compare(a.version))
}