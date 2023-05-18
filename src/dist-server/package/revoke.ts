import { authorizationFailed, authorize, fail, invalidArgument, IsContributor, permissionDenied, IsDir, IsFile, done } from 'server/utils'
import { chmod } from 'fs/promises'
import { RequestContext } from 'jetweb'
import { busyPackages } from './common'
import { PackageId } from 'format'

export async function postRevoke(this: RequestContext, id: string) {
    // 检查用户是否登录
    const user = await authorize(this)
    if (!user) return authorizationFailed()

    // 检查包ID是否合法
    const packageId = PackageId.FromString(id)
    if (packageId instanceof Error) return invalidArgument('Invalid package id: ' + packageId.message)

    // 检查仓库是否存在
    if (!await IsDir(packageId.repoPath)) return fail(1, 'Repository not exists: ' + packageId.repoPath)

    // 检查用户是否有权限发布包
    if (!await IsContributor(user.name, packageId.repoPath))
        return permissionDenied('You are not a contributor of this repository: ' + packageId.repoId)

    // 检查包是否已存在
    if (!await IsFile(packageId.path)) return fail(1, 'Package not exists: ' + id)

    // 检查包是否正在发布，如果正在发布则返回错误
    if (busyPackages.has(packageId.toString())) return fail(6, 'Package is busy: ' + id)

    // 撤销包的任何访问权限
    await chmod(packageId.path, 0o000)
    return done()
}