import Repo from './repo'
import Scope from './scope'
import Package from './package'
import User from './user'
import { postTasks } from './task'
import { chmodSync, mkdirSync } from "fs"
import { userInfo } from "os"
import { PATH_CONTRIBUTORS, PATH_REPOSITORIES } from "../utils"
import { Feature } from '@godgnidoc/decli'
import { Web } from 'jetweb'

export const distServeFeature = new class extends Feature {
    async entry() {
        if (userInfo({ encoding: 'utf-8' }).username !== 'dist') {
            console.error('You must run this program as user "dist"')
            return 1
        }

        mkdirSync(PATH_CONTRIBUTORS, { recursive: true })
        chmodSync(PATH_CONTRIBUTORS, 0o700)
        mkdirSync(PATH_REPOSITORIES, { recursive: true })

        const api = { Repo, Scope, Package, User, postTasks }
        const web = new Web({ api }, { static: true })
        web.listen(5000)

        // 保持运行
        return new Promise<number>(() => { })
    }
}