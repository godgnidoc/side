import { readFile, writeFile } from 'fs/promises'
import { done, fail, invalidArgument, md5 } from 'server/utils'
import { join } from 'path'
import { SidePlatform } from 'platform'
import { IsValidName, UserManifest, loadJson } from 'format'

export async function postLogin(name: string, password: string) {
    // 检查用户名格式
    if (!name || !IsValidName(name))
        return invalidArgument('Invalid name : ' + name)

    // 检查密码格式
    if (!password)
        return invalidArgument('Invalid password')

    try {
        const pathUserHome = join(SidePlatform.server.contributors, name)

        // 读取用户信息
        const info = await loadJson<UserManifest>(join(pathUserHome, 'info'), 'UserManifest')

        // 检查用户是否被封禁
        if (info.blocked) return fail(3, 'User is blocked')

        // 检查密码
        const phrase = await readFile(join(pathUserHome, 'phrase'), 'utf-8')
        if (phrase.toString() === md5(`${name}:${password}`)) {
            // 登录成功，生成 token
            const token = md5(`${name}:${password}:${Date.now()}`)
            await writeFile(join(pathUserHome, 'token'), token)
            return done(token)
        } else {
            return fail(2, 'Wrong password')
        }
    } catch(e) {
        console.error(e)
        return fail(1, 'User not found')
    }
}