import { authorization_failed, authorize, fail, invalid_argument, IsContributor, permission_denied, IsDir, IsFile, done } from '../utils'
import { chmod } from 'fs/promises'
import { RequestContext } from 'jetweb'
import { busyPackages } from './common'
import { PackageId } from 'format'

async function RevokePackage(this: RequestContext, id: string) {
    // 检查用户是否登录
    const user = await authorize(this)
    if (!user) return authorization_failed()

    // 检查包ID是否合法
    const packageId = PackageId.Parse(id)
    if (packageId instanceof Error) return invalid_argument('Invalid package id: ' + packageId.message)

    // 检查仓库是否存在
    if (!await IsDir(packageId.repo_path)) return fail(1, 'Repository not exists: ' + packageId.repo_path)

    // 检查用户是否有权限发布包
    if (!await IsContributor(user.name, packageId.repo_path))
        return permission_denied('You are not a contributor of this repository: ' + packageId.repo_id)

    // 检查包是否已存在
    if (!await IsFile(packageId.path)) return fail(1, 'Package not exists: ' + id)

    // 检查包是否正在发布，如果正在发布则返回错误
    if (busyPackages.has(packageId.toString())) return fail(6, 'Package is busy: ' + id)

    // 撤销包的任何访问权限
    await chmod(packageId.path, 0o000)
    return done()
}

export const Revoke = {
    async postByName(scope: string, name: string, tags: string[]) {
        const packageId = PackageId.Parse(name)
        if (packageId instanceof Error) return invalid_argument('Invalid package name: ' + packageId.message)
        if (!packageId.setScope(scope)) return invalid_argument('Invalid package scope: ' + scope)
        if (!packageId.setTags(tags)) return invalid_argument('Invalid package tags: ' + tags.join(','))
        return await RevokePackage.call(this, packageId.toString())
    },
    async postById(id: string) {
        return await RevokePackage.call(this, id)
    }
}