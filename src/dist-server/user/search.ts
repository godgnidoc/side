import { access, readFile, readdir } from "fs/promises"
import { done, fail, invalid_argument } from "../utils"
import { join } from "path"
import { IsValidName } from "format"
import { SidePlatform } from 'platform'

// 检查用户是否存在
export async function getExist(name: string) {
    // 检查用户名格式
    if (!name || !IsValidName(name)) return invalid_argument('Invalid name')

    try {
        // 用户路径存在即表示用户存在
        await access(join(SidePlatform.server.contributors, name))
        return done(true)
    } catch {
        return fail(404, 'User not found')
    }
}

export async function getList() {
    try {
        const names = await readdir(SidePlatform.server.contributors)
        const users = []
        for( const name of names ) {
            const user = await readFile(join(SidePlatform.server.contributors, name, 'info'), 'utf-8')
            users.push(JSON.parse(user))
        }
        return done(users)
    } catch {
        return fail(500, 'Internal server error')
    }
}