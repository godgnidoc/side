import { Repo } from './repo'
import { Scope } from './scope'
import { Package } from './package'
import { User } from './user'
import { createAdmin } from './user/admin'
import { postTasks } from './task'
import { userInfo } from 'os'
import { Feature } from '@godgnidoc/decli'
import { Web } from 'jetweb'
import { chmod, mkdir, readdir } from 'fs/promises'
import { SidePlatform } from 'platform'

export const distServeFeature = new class extends Feature {
    async entry() {
        if (userInfo({ encoding: 'utf-8' }).username !== 'dist') {
            console.error('Dist Server must run as user "dist"')
            return 1
        }

        // 创建仓库和贡献者目录
        await mkdir(SidePlatform.server.repositories, { recursive: true })
        await mkdir(SidePlatform.server.contributors, { recursive: true })
        await chmod(SidePlatform.server.contributors, 0o700)

        // 检查是否有用户，没有则创建 admin 用户
        if ((await readdir(SidePlatform.server.contributors)).length === 0) {
            console.info('No user found, creating admin user')
            await createAdmin()
        }

        const api = { Repo, Scope, Package, User, postTasks }
        const web = new Web({ api }, { static: true })
        console.info('dist server supported by side - %s - %s', SidePlatform.version, SidePlatform.revision)
        web.listen(5000)

        // 保持运行
        return new Promise<number>(() => { })
    }
}