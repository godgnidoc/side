import { readFile, writeFile } from "fs/promises"
import { done, fail, invalid_argument, md5 } from "../utils"
import { join } from "path"
import { SidePlatform } from 'platform'
import { IsValidName, UserInfo } from "format"

export async function postLogin(name: string, password: string) {
    // 检查用户名格式
    if (!name || !IsValidName(name))
        return invalid_argument('Invalid name : ' + name)

    // 检查密码格式
    if (!password)
        return invalid_argument('Invalid password')

    try {
        const path_user_home = join(SidePlatform.server.contributors, name)

        // 读取用户信息
        const raw_info = await readFile(join(path_user_home, 'info'), 'utf-8')
        const info = UserInfo.Parse(JSON.parse(raw_info.toString()))

        // 检查用户是否被封禁
        if (info.blocked) return fail(3, 'User is blocked')

        // 检查密码
        const phrase = await readFile(join(path_user_home, 'phrase'), 'utf-8')
        if (phrase.toString() === md5(`${name}:${password}`)) {
            // 登录成功，生成 token
            const token = md5(`${name}:${password}:${Date.now()}`)
            await writeFile(join(path_user_home, 'token'), token)
            return done(token)
        } else {
            return fail(2, 'Wrong password')
        }
    } catch {
        return fail(1, 'User not found')
    }
}