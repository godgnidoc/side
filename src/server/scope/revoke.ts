import { join } from 'path'
import { IsDir, IsOwner, authorizationFailed, authorize, done, fail, internalFailure, invalidArgument, permissionDenied } from 'server/utils'
import { chmod } from 'fs/promises'
import { IsValidScope } from 'format'
import { SidePlatform } from 'platform'

/**
 * 删除作用域，实际仅将作用域权限设置为000，不真正执行删除操作
 * @param scope 作用域名
 */
export async function postRevoke(scope: string) {
    // 鉴权并获取用户信息
    const user = await authorize(this)
    if (!user) return authorizationFailed()

    // 检查作用域名格式
    if (!IsValidScope(scope)) return invalidArgument('scope name is invalid')

    // 检查作用域是否存在
    if (!await IsDir(join(SidePlatform.server.repositories, scope))) return fail(1, 'scope not exists')

    // 检查用户是否为作用域所有者
    if (!await IsOwner(join(SidePlatform.server.repositories, scope), user.name))
        return permissionDenied('you are not the owner of the scope: ' + scope)

    // 将作用域权限设置为000
    try {
        await chmod(join(SidePlatform.server.repositories, scope), 0o000)
        return done()
    } catch (error) {
        return internalFailure('revoke scope failed: ' + error.message)
    }
}