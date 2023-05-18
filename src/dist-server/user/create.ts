import { mkdir, writeFile } from 'fs/promises'
import { authorize, done, fail, invalidArgument, md5, permissionDenied } from 'server/utils'
import { join } from 'path'
import { IsValidName } from 'format'
import { SidePlatform } from 'platform'

export async function postCreate(name: string, password: string, email: string) {
    // 鉴权并获取用户信息
    const user = await authorize(this)
    if (!user) return permissionDenied('You are not logged in')
    if( user.name !== 'admin' ) return permissionDenied('You are not admin')

    // 检查用户名格式
    if (!name || !IsValidName(name))
        return invalidArgument('Invalid name')

    // 检查邮箱格式
    if (!email || email.match(/^[a-zA-Z0-9_-]+@[a-zA-Z0-9_-]+(\.[a-zA-Z0-9_-]+)+$/) == null)
        return invalidArgument('Invalid email')

    // 检查密码格式
    if (!password)
        return invalidArgument('Invalid password')

    try {
        const pathUserHome = join(SidePlatform.server.contributors, name)

        // 创建用户目录
        await mkdir(pathUserHome)

        // 写入用户信息
        await writeFile(join(pathUserHome, 'info'), JSON.stringify({ name, email }))

        // 写入用户密码
        await writeFile(join(pathUserHome, 'phrase'), md5(`${name}:${password}`))

        return done(true)
    } catch {
        return fail(1, 'Failed to create user, maybe already exists')
    }
}