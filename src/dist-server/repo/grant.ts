import { join } from "path"
import { IsDir, IsOwner, authorization_failed, authorize, done, fail, internal_failure, invalid_argument, permission_denied } from "../utils"
import { readFile, writeFile } from "fs/promises"
import { RequestContext } from "jetweb"
import { IsValidName, IsValidScope, RepoManifest } from "format"
import { SidePlatform } from "platform"

async function GrantRepo(this: RequestContext, repo: string, scope: string, user: string) {
    // 鉴权并获取用户信息
    const owner = await authorize(this)
    if (!owner) return authorization_failed()

    // 检查用户是否存在
    if (!await IsDir(join(SidePlatform.server.contributors, user))) return fail(1, 'user not exists')

    // 检查作用域名格式
    if (!IsValidScope(scope)) return invalid_argument('scope name is invalid')

    // 检查作用域是否存在
    if (!await IsDir(join(SidePlatform.server.repositories, scope))) return fail(1, 'scope not exists')

    // 检查仓库名格式
    if (!IsValidName(repo)) return invalid_argument('repo name is invalid')

    // 检查仓库是否存在
    const repo_path = join(SidePlatform.server.repositories, scope, repo)
    if (!await IsDir(repo_path)) return fail(1, 'repo not exists')

    // 检查用户是否为作用域所有者
    if (!await IsOwner(owner.name, join(SidePlatform.server.repositories, scope)))
        return permission_denied('you are not the owner of the scope: ' + scope)

    // 添加贡献者到清单文件
    const manifest_path = join(SidePlatform.server.repositories, scope, 'manifest')
    const raw_manifest = await readFile(manifest_path, 'utf-8')
    const manifest = RepoManifest.Parse(raw_manifest)
    if (!manifest) return internal_failure('parse manifest failed')

    /** @TODO 使用文件锁保护清单文件 */
    if (!manifest.contributors.includes(user)) {
        manifest.contributors.push(user)
        await writeFile(manifest_path, manifest.toString())
    }

    return done()
}



export const Grant = {
    async postByName(scope: string, repo: string, user: string) {
        return await GrantRepo.call(this, scope, repo, user)
    },

    async postById(repo_id: string, user: string) {
        const [scope, repo] = repo_id.split('/')
        return await GrantRepo.call(this, scope, repo, user)
    }
}