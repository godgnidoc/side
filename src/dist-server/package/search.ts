import { IsValidName, IsValidScope, PackageId } from 'format'
import { invalidArgument, done, MatchPattern } from 'server/utils'

import { QueryPackages } from './common'
import { readdir } from 'fs/promises'
import { join } from 'path'
import { SidePlatform } from 'platform'

export const Search = {
    async getByName(scope: string, repo: string, tags: string[], version?: string) {
        const packageId = PackageId.FromScopeAndName(scope, repo, version, tags)
        if (packageId instanceof Error) return invalidArgument('Invalid package name: ' + packageId.message)

        const packages = await QueryPackages(packageId.query, version)

        return done(packages.map(id => id.toString()))
    },
    async getByQuery(query: string, version?: string) {
        const packages = await QueryPackages(query, version)

        return done(packages.map(id => id.toString()))
    },
    async getByPattern(pattern: string) {
        // 列举所有作用域
        const scopes = (await readdir(SidePlatform.server.repositories, { withFileTypes: true }))
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name)
            .filter(scope => IsValidScope(scope))

        const repos: string[] = []
        for (const scope of scopes) {
            const baseDir = join(SidePlatform.server.repositories, scope)
            const repoNames = (await readdir(baseDir, { withFileTypes: true }))
                .filter(dirent => dirent.isDirectory())
                .map(dirent => dirent.name)
                .filter(repo => IsValidName(repo))
            repos.push(...repoNames.map(repo => scope + '/' + repo))
        }

        const all: string[] = []
        for (const repo of repos) {
            for (const entry of (await readdir(join(SidePlatform.server.repositories, repo)))) {
                const path = join(SidePlatform.server.repositories, repo, entry)
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