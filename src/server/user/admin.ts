import * as crypto from 'crypto'
import { join } from 'path'
import { md5 } from 'server/utils'
import base32 from 'base32'
import { mkdir, writeFile } from 'fs/promises'
import { SidePlatform } from 'platform'

function randomPassword() {
    const basis = crypto.randomBytes(64).toString('hex')
    const base64 = Buffer.from(basis, 'hex')
    const result = base32.encode(base64)
    return result.slice(0, 16)
}

export async function createAdmin() {
    const name = 'admin'
    const email = 'admin@dist.com'
    const password = randomPassword()

    console.info('Creating admin user: %s', name)
    console.info('Password: %s', password)
    console.info('Notion \x1b[1;31m!!! Please remember the password since it will not be shown again !!!\x1b[0m')

    const pathUserHome = join(SidePlatform.server.contributors, name)

    // 创建用户目录
    await mkdir(pathUserHome)

    // 写入用户信息
    await writeFile(join(pathUserHome, 'info'), JSON.stringify({ name, email }))

    // 写入用户密码
    await writeFile(join(pathUserHome, 'phrase'), md5(`${name}:${password}`))
}