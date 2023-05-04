import { join } from "path"
import { MatchPattern, done, invalid_argument } from "../utils"
import { readdir } from "fs/promises"
import { IsValidScope, PackageId } from "format"
import { PATH_REPOSITORIES } from "environment"

export async function getSearch(query?: string, scope?: string) {
    const scopes: string[] = []

    if (scope) {
        // 在指定作用域下搜索
        if (!IsValidScope(scope)) return invalid_argument('scope name is invalid')
        scopes.push(scope)
    } else {
        // 在所有作用域下搜索
        scopes.push(...(await readdir(PATH_REPOSITORIES, { withFileTypes: true }))
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name)
            .filter(scope => IsValidScope(scope)))
    }

    const repos: string[] = []

    // 搜索每一个作用域下匹配请求的仓库
    for (const scope of scopes) try {
        const base_dir = join(PATH_REPOSITORIES, scope)
        const repo_names = (await readdir(base_dir, { withFileTypes: true }))
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name)
            .filter(repo => PackageId.Parse(repo + '-0.0.0') instanceof PackageId)
            .filter(repo => !query || MatchPattern(repo, query))
        repos.push(...repo_names.map(repo => scope + '/' + repo))
    } catch {
        // ignore
    }
    return done(repos)
}