import Repo from './repo'
import Scope from './scope'
import Package from './package'
import User from './user'
import { createAdmin } from './user/admin'
import { postTasks } from './task'
import { userInfo } from "os"
import { PATH_CONTRIBUTORS, PATH_REPOSITORIES } from "../utils"
import { Feature } from '@godgnidoc/decli'
import { Web } from 'jetweb'
import { chmod, mkdir, readdir } from 'fs/promises'
import { sideRevision, sideVersion } from '../../environment'

export const distServeFeature = new class extends Feature {
    async entry() {
        if (userInfo({ encoding: 'utf-8' }).username !== 'dist') {
            console.error('Dist Server must run as user "dist"')
            return 1
        }

        await mkdir(PATH_REPOSITORIES, { recursive: true })
        await mkdir(PATH_CONTRIBUTORS, { recursive: true })
        if ((await readdir(PATH_CONTRIBUTORS)).length === 0) {
            console.info('No user found, creating admin user')
            await createAdmin()
        }
        await chmod(PATH_CONTRIBUTORS, 0o700)

        const api = { Repo, Scope, Package, User, postTasks }
        const web = new Web({ api }, { static: true })
        console.info('dist server supported by side - %s - %s', sideVersion, sideRevision)
        web.listen(5000)

        // 保持运行
        return new Promise<number>(() => { })
    }
}