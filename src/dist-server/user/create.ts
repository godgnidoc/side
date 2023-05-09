import { mkdir, writeFile } from "fs/promises"
import { authorize, done, fail, invalid_argument, md5, permission_denied } from "../utils"
import { join } from "path"
import { IsValidName } from "format"
import { SidePlatform } from 'platform'

export async function postCreate(name: string, password: string, email: string) {
    // 鉴权并获取用户信息
    const user = await authorize(this)
    if (!user) return permission_denied('You are not logged in')
    if( user.name !== 'admin' ) return permission_denied('You are not admin')

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
        const path_user_home = join(SidePlatform.server.contributors, name)

        // 创建用户目录
        await mkdir(path_user_home)

        // 写入用户信息
        await writeFile(join(path_user_home, 'info'), JSON.stringify({ name, email }))

        // 写入用户密码
        await writeFile(join(path_user_home, 'phrase'), md5(`${name}:${password}`))

        return done(true)
    } catch {
        return fail(1, 'Failed to create user, maybe already exists')
    }
}