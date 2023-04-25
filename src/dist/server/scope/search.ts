import { IsValidScope, MatchPattern, PATH_REPOSITORIES, done } from "../../utils"
import { readdir } from "fs/promises"

/**
 * 列举作用域
 * @param query 查询字符串，格式为文件名通配符
 */
export async function getList(query?: string) {
    // 整理查询字符串
    if (!query) query = '@*'
    else if (!query.startsWith('@')) query = '@' + query

    try {
        // 列举所有作用域
        const scopes = (await readdir(PATH_REPOSITORIES, { withFileTypes: true }))
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name)
            .filter(scope => IsValidScope(scope))
            .filter(scope => !query || MatchPattern(scope, query))
        return done(scopes)
    } catch {
        return done([])
    }
}