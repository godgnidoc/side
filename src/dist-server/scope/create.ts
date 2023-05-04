import { join } from "path"
import { IsDir, authorization_failed, authorize, done, fail, internal_failure, invalid_argument } from "../utils"
import { mkdir, writeFile } from "fs/promises"
import { IsValidScope } from "format"
import { PATH_REPOSITORIES } from "environment"

export async function postCreate(name: string) {
    // 鉴权并获取用户信息
    const user = await authorize(this)
    if (!user) return authorization_failed()

    // 检查作用域名格式
    if (!IsValidScope(name))
        return invalid_argument('scope name is invalid')

    // 检查作用域是否存在
    console.debug('checking scope: %s', join(PATH_REPOSITORIES, name))
    if (await IsDir(join(PATH_REPOSITORIES, name)))
        return fail(1, 'scope already exists')

    try {
        // 创建作用域目录
        await mkdir(join(PATH_REPOSITORIES, name))

        // 写入贡献者列表，列表首元素被视为作用域所有者
        await writeFile(join(PATH_REPOSITORIES, name, 'manifest'), JSON.stringify({
            contributors: [user.name]
        }))
        return done()
    } catch (error) {
        return internal_failure('create scope failed: ' + error.message)
    }
}