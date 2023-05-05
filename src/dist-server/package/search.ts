import { IsValidName, IsValidScope, PackageId } from 'format'
import { invalid_argument, done, MatchPattern } from '../utils'

import { QueryPackages } from './common'
import { readdir } from 'fs/promises'
import { PATH_REPOSITORIES } from 'environment'
import { join } from 'path'

export const Search = {
    async getByName(scope: string, repo: string, tags: string[], version?: string) {
        const packageId = PackageId.Parse(repo)
        if (packageId instanceof Error) return invalid_argument('Invalid package name: ' + packageId.message)
        if (!packageId.setScope(scope)) return invalid_argument('Invalid package scope: ' + scope)
        if (!packageId.setTags(tags)) return invalid_argument('Invalid package tags: ' + tags.join(','))

        const packages = await QueryPackages(packageId.query, version)

        return done(packages.map(id => id.toString()))
    },
    async getByQuery(query: string, version?: string) {
        const packages = await QueryPackages(query, version)

        return done(packages.map(id => id.toString()))
    },
    async getByPattern(pattern: string) {
        // 列举所有作用域
        const scopes = (await readdir(PATH_REPOSITORIES, { withFileTypes: true }))
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name)
            .filter(scope => IsValidScope(scope))

        const repos: string[] = []
        for (const scope of scopes) {
            const base_dir = join(PATH_REPOSITORIES, scope)
            const repo_names = (await readdir(base_dir, { withFileTypes: true }))
                .filter(dirent => dirent.isDirectory())
                .map(dirent => dirent.name)
                .filter(repo => IsValidName(repo))
            repos.push(...repo_names.map(repo => scope + '/' + repo))
        }

        const all: string[] = []
        for (const repo of repos) {
            for (const entry of (await readdir(join(PATH_REPOSITORIES, repo)))) {
                const path = join(PATH_REPOSITORIES, repo, entry)
                const id = PackageId.FromPath(path)
                if (id instanceof Error) continue
                const idstr = id.toString()
                if (pattern && !MatchPattern(idstr, pattern)) continue
                all.push(idstr)
            }
        }

        return done(all)
    }
}