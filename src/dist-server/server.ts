import { Repo } from './repo'
import { Scope } from './scope'
import { Package } from './package'
import { User } from './user'
import { createAdmin } from './user/admin'
import { postTasks } from './task'
import { userInfo } from "os"
import { Feature } from '@godgnidoc/decli'
import { Web } from 'jetweb'
import { chmod, mkdir, readdir } from 'fs/promises'
import { PATH_CONTRIBUTORS, PATH_REPOSITORIES, sideRevision, sideVersion } from 'environment'

export const distServeFeature = new class extends Feature {
    async entry() {
        if (userInfo({ encoding: 'utf-8' }).username !== 'dist') {
            console.error('Dist Server must run as user "dist"')
            return 1
        }

        // 创建仓库和贡献者目录
        await mkdir(PATH_REPOSITORIES, { recursive: true })
        await mkdir(PATH_CONTRIBUTORS, { recursive: true })
        await chmod(PATH_CONTRIBUTORS, 0o700)

        // 检查是否有用户，没有则创建 admin 用户
        if ((await readdir(PATH_CONTRIBUTORS)).length === 0) {
            console.info('No user found, creating admin user')
            await createAdmin()
        }

        const api = { Repo, Scope, Package, User, postTasks }
        const web = new Web({ api }, { static: true })
        console.info('dist server supported by side - %s - %s', sideVersion, sideRevision)
        web.listen(5000)

        // 保持运行
        return new Promise<number>(() => { })
    }
}