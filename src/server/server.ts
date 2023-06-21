import { Repo } from './repo'
import { Scope } from './scope'
import { Package } from './package'
import { User } from './user'
import { createAdmin } from './user/admin'
import { postTasks } from './task'
import { getDl } from './download'
import { userInfo } from 'os'
import { Feature } from '@godgnidoc/decli'
import { Web } from 'jetweb'
import { chmod, copyFile, mkdir } from 'fs/promises'
import { SidePlatform } from 'platform'
import { fail } from './utils'
import { dirname, join } from 'path'
import { promisify } from 'util'
import { exec } from 'child_process'
import { IsDir } from 'filesystem'

export const distServeFeature = new class extends Feature {
    async entry() {
        if (userInfo({ encoding: 'utf-8' }).username !== 'dist') {
            console.error('Dist Server must run as user "dist"')
            return 1
        }

        // 创建仓库和贡献者目录
        await mkdir(SidePlatform.server.repositories, { recursive: true })
        await mkdir(SidePlatform.server.contributors, { recursive: true })
        await mkdir(SidePlatform.server.downloadable, { recursive: true })
        await chmod(SidePlatform.server.contributors, 0o700)

        // 初始化下载资源
        await copyFile(
            join(dirname(new URL(import.meta.url).pathname), 'install.sh'),
            join(SidePlatform.server.downloadable, 'install.sh')
        )
        await copyFile(
            (await promisify(exec)('which node')).stdout.trim(),
            join(SidePlatform.server.downloadable, 'node')
        )

        // 检查是否有用户，没有则创建 admin 用户
        if (!await IsDir(join(SidePlatform.server.contributors, 'admin'))) {
            console.info('No user found, creating admin user')
            await createAdmin()
        }

        const api = { Repo, Scope, Package, User, postTasks, getDl }
        const web = new Web({ api }, {
            static: true,
            catch: (err) => {
                return fail(500, err.message)
            }
        })
        console.info('dist server supported by side - %s - %s', SidePlatform.version, SidePlatform.revision)
        web.listen(5000)

        // 保持运行
        return new Promise<number>(() => { })
    }
}