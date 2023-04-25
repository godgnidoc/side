import { mkdir, writeFile } from "fs/promises"
import { IsValidName, PATH_CONTRIBUTORS, done, fail, invalid_argument, md5 } from "../../utils"
import { join } from "path"

export async function postCreate(name: string, password: string, email: string) {
    // 检查用户名格式
    if (!name || !IsValidName(name))
        return invalid_argument('Invalid name')

    // 检查邮箱格式
    if (!email || email.match(/^[a-zA-Z0-9_-]+@[a-zA-Z0-9_-]+(\.[a-zA-Z0-9_-]+)+$/) == null)
        return invalid_argument('Invalid email')

    // 检查密码格式
    if (!password)
        return invalid_argument('Invalid password')

    try {
        const path_user_home = join(PATH_CONTRIBUTORS, name)

        // 创建用户目录
        mkdir(path_user_home)

        // 写入用户信息
        await writeFile(join(path_user_home, 'info'), JSON.stringify({ name, email }))

        // 写入用户密码
        await writeFile(join(path_user_home, 'phrase'), md5(`${name}:${password}`))

        return done(true)
    } catch {
        return fail(1, 'Failed to create user, maybe already exists')
    }
}