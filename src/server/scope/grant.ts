import { join } from 'path'
import { IsDir, IsOwner, authorizationFailed, authorize, done, fail, invalidArgument, permissionDenied } from 'server/utils'
import { writeFile } from 'fs/promises'
import { IsValidScope, PackageId, RepoManifest, loadJson } from 'format'
import { SidePlatform } from 'platform'

export async function postGrant(scope: string, user: string) {
    const packageId = PackageId.FromScopeAndName(scope, 'useless')
    if( packageId instanceof Error) return fail(1, packageId.message)
    
    // 鉴权并获取用户信息
    const owner = await authorize(this)
    if (!owner) return authorizationFailed()

    // 检查用户是否存在
    if (!await IsDir(join(SidePlatform.server.contributors, user))) return fail(1, 'user not exists')

    // 检查作用域名格式
    if (!IsValidScope(scope)) return invalidArgument('scope name is invalid')

    // 检查作用域是否存在
    if (!await IsDir(packageId.scopePath)) return fail(1, 'scope not exists')

    // 检查用户是否为作用域所有者
    if (!await IsOwner(packageId.scopePath, owner.name))
        return permissionDenied('you are not the owner of the scope: ' + scope)

    // 添加贡献者到清单文件
    const manifestPath = join(SidePlatform.server.repositories, scope, 'manifest')
    const manifest = await loadJson<RepoManifest>(manifestPath, 'RepoManifest')

    /** @TODO 使用文件锁保护清单文件 */
    if (!manifest.contributors.includes(user)) {
        manifest.contributors.push(user)
        await writeFile(manifestPath, JSON.stringify(manifest))
    }

    return done()
}