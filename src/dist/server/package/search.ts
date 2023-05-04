import { PackageId } from 'format'
import { invalid_argument, done } from '../../utils'

import { QueryPackages } from './common'

export const List = {
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
    }
}