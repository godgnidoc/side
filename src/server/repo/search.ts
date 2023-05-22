import { join } from 'path'
import { done, invalidArgument } from 'server/utils'
import { readdir } from 'fs/promises'
import { IsValidName, IsValidScope } from 'format'
import { SidePlatform } from 'platform'
import { MatchPattern } from 'filesystem'

export async function getSearch(pattern?: string, scope?: string) {
    const scopes: string[] = []

    if (scope) {
        // 在指定作用域下搜索
        if (!IsValidScope(scope)) return invalidArgument('scope name is invalid')
        scopes.push(scope)
    } else {
        // 在所有作用域下搜索
        scopes.push(...(await readdir(SidePlatform.server.repositories, { withFileTypes: true }))
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name)
            .filter(scope => IsValidScope(scope)))
    }

    const repos: string[] = []

    // 搜索每一个作用域下匹配请求的仓库
    for (const scope of scopes) try {
        const baseDir = join(SidePlatform.server.repositories, scope)
        const repoNames = (await readdir(baseDir, { withFileTypes: true }))
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name)
            .filter(repo => IsValidName(repo))
            .filter(repo => !pattern || MatchPattern(scope + '/' + repo, pattern) || MatchPattern(repo, pattern))
        repos.push(...repoNames.map(repo => scope + '/' + repo))
    } catch {
        // ignore
    }
    return done(repos)
}