import { readFile, readdir } from 'fs/promises'
import { done, fail, invalidArgument } from 'server/utils'
import { join } from 'path'
import { IsValidName } from 'format'
import { SidePlatform } from 'platform'
import { IsExist } from 'filesystem'

// 检查用户是否存在
export async function getExist(name: string) {
    // 检查用户名格式
    if (!name || !IsValidName(name)) return invalidArgument('Invalid name')

    // 用户路径存在即表示用户存在
    if (await IsExist(join(SidePlatform.server.contributors, name))) {
        return done(true)

    } else {
        return fail(404, 'User not found')
    }
}

export async function getList() {
    try {
        const names = await readdir(SidePlatform.server.contributors)
        const users = []
        for (const name of names) {
            const user = await readFile(join(SidePlatform.server.contributors, name, 'info'), 'utf-8')
            users.push(JSON.parse(user))
        }
        return done(users)
    } catch {
        return fail(500, 'Internal server error')
    }
}