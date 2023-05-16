import { MatchPattern, done } from '../utils'
import { readdir } from 'fs/promises'
import { IsValidScope } from 'format'
import { SidePlatform } from 'platform'

/**
 * 列举作用域
 * @param pattern 查询字符串，格式为文件名通配符
 */
export async function getSearch(pattern?: string) {
    // 整理查询字符串
    if (!pattern) pattern = '@*'
    else if (!pattern.startsWith('@')) pattern = '@' + pattern

    try {
        // 列举所有作用域
        const scopes = (await readdir(SidePlatform.server.repositories, { withFileTypes: true }))
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name)
            .filter(scope => IsValidScope(scope))
            .filter(scope => !pattern || MatchPattern(scope, pattern))
        return done(scopes)
    } catch {
        return done([])
    }
}