import { join } from 'path'
import { authorizationFailed, authorize, done, fail, internalFailure, invalidArgument } from 'server/utils'
import { mkdir, writeFile } from 'fs/promises'
import { IsValidScope } from 'format'
import { SidePlatform } from 'platform'
import { IsDir } from 'filesystem'

export async function postCreate(name: string) {
    // 鉴权并获取用户信息
    const user = await authorize(this)
    if (!user) return authorizationFailed()

    // 检查作用域名格式
    if (!IsValidScope(name))
        return invalidArgument('scope name is invalid')

    // 检查作用域是否存在
    console.debug('checking scope: %s', join(SidePlatform.server.repositories, name))
    if (await IsDir(join(SidePlatform.server.repositories, name)))
        return fail(1, 'scope already exists')

    try {
        // 创建作用域目录
        await mkdir(join(SidePlatform.server.repositories, name))

        // 写入贡献者列表，列表首元素被视为作用域所有者
        await writeFile(join(SidePlatform.server.repositories, name, 'manifest'), JSON.stringify({
            contributors: [user.name]
        }))
        return done()
    } catch (error) {
        return internalFailure('create scope failed: ' + error.message)
    }
}