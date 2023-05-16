import { join } from "path"
import { IsContributor, IsDir, authorize, done, fail, internal_failure, invalid_argument, permission_denied } from "../utils"
import { mkdir, writeFile } from "fs/promises"
import { RequestContext } from "jetweb"
import { IsValidName, IsValidScope } from "format"
import { SidePlatform } from "platform"

async function CreateRepo(this: RequestContext, name: string, scope: string) {
    // 鉴权并获取用户信息
    const user = await authorize(this)
    if (!user) return permission_denied('You are not logged in')

    // 检查仓库名格式
    if (!IsValidName(name)) return invalid_argument('scope name is invalid')

    // 检查作用域，作用域必须存在，且用户必须是作用域贡献者
    if (!IsValidScope(scope)) return invalid_argument('scope name is invalid')
    if (!await IsDir(join(SidePlatform.server.repositories, scope))) return fail(2, 'scope not exists')
    if (!await IsContributor(user.name, join(SidePlatform.server.repositories, scope)))
        return permission_denied('You are not a contributor of this repository: ' + scope)

    // 检查包仓是否存在
    const repo_path = join(SidePlatform.server.repositories, scope, name)
    if (await IsDir(repo_path)) return fail(1, 'repo already exists')

    try {
        // 创建作用域目录
        await mkdir(repo_path)

        // 写入贡献者列表，列表首元素被视为作用域所有者
        await writeFile(join(repo_path, 'manifest'), JSON.stringify({
            contributors: [user.name]
        }))
        return done()
    } catch (error) {
        return internal_failure('create repo failed: ' + error.message)
    }
}


export const Create = {
    async postByName(name: string, scope: string) {
        return await CreateRepo.call(this, name, scope)
    },

    async postById(id: string) {
        const [scope, name] = id.split('/')
        return await CreateRepo.call(this, name, scope)
    }
}