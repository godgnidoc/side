import { join } from "path"
import { IsDir, IsOwner, authorization_failed, authorize, done, fail, internal_failure, invalid_argument, permission_denied } from "../utils"
import { chmod, } from "fs/promises"
import { RequestContext } from "jetweb"
import { IsValidName, IsValidScope } from "format"
import { SidePlatform } from "platform"

/**
 * 删除仓库，实际仅将仓库权限设置为000，不真正执行删除操作
 * @param scope 作用域名
 * @param repo 仓库名
 */
async function RevokeRepo(this: RequestContext, repo: string, scope: string) {
    // 鉴权并获取用户信息
    const user = await authorize(this)
    if (!user) return authorization_failed()

    // 检查仓库名格式
    if (!IsValidName(repo)) return invalid_argument('repo name is invalid')

    // 检查作用域名格式
    if (!IsValidScope(scope)) return invalid_argument('scope name is invalid')

    const repo_path = join(SidePlatform.server.repositories, scope, repo)

    // 检查仓库是否存在
    if (!await IsDir(repo_path)) return fail(1, 'repo not exists')

    // 检查用户是否为仓库所有者
    if (!IsOwner(user.name, repo_path))
        return permission_denied('You are not the owner of this repository: ' + scope + '/' + repo)

    // 将仓库权限设置为000
    try {
        await chmod(repo_path, 0o000)
        return done()
    } catch (error) {
        return internal_failure('revoke repo failed: ' + error.message)
    }
}

export const Revoke = {
    async postByName(repo: string, scope: string) {
        return await RevokeRepo.call(this, repo, scope)
    },
    async postById(id: string) {
        const [scope, repo] = id.split('/')
        return await RevokeRepo.call(this, repo, scope)
    }
}