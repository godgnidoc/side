import { join } from 'path'
import { IsContributor, authorize, done, fail, internalFailure, invalidArgument, permissionDenied } from 'server/utils'
import { mkdir, writeFile } from 'fs/promises'
import { RequestContext } from 'jetweb'
import { IsValidName, IsValidScope } from 'format'
import { SidePlatform } from 'platform'
import { IsDir } from 'filesystem'

async function CreateRepo(this: RequestContext, name: string, scope: string) {
    // 鉴权并获取用户信息
    const user = await authorize(this)
    if (!user) return permissionDenied('You are not logged in')

    // 检查仓库名格式
    if (!IsValidName(name)) return invalidArgument('scope name is invalid')

    // 检查作用域，作用域必须存在，且用户必须是作用域贡献者
    if (!IsValidScope(scope)) return invalidArgument('scope name is invalid')
    if (!await IsDir(join(SidePlatform.server.repositories, scope))) return fail(2, 'scope not exists')
    if (!await IsContributor(join(SidePlatform.server.repositories, scope), user.name))
        return permissionDenied('You are not a contributor of this repository: ' + scope)

    // 检查包仓是否存在
    const repoPath = join(SidePlatform.server.repositories, scope, name)
    if (await IsDir(repoPath)) return fail(1, 'repo already exists')

    try {
        // 创建作用域目录
        await mkdir(repoPath)

        // 写入贡献者列表，列表首元素被视为作用域所有者
        await writeFile(join(repoPath, 'manifest'), JSON.stringify({
            contributors: [user.name]
        }))
        return done()
    } catch (error) {
        return internalFailure('create repo failed: ' + error.message)
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