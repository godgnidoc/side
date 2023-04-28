import { Feature } from "@godgnidoc/decli"
import inquirer from 'inquirer'
import { api } from "./api"
import { getGlobalSettings } from "../../environment"
import { mkdir, writeFile } from "fs/promises"
import { dump } from "js-yaml"
import { sideHome } from "../../environment"
import { join } from "path"

export const distLoginFeature = new class extends Feature {
    args = '<username>'
    brief = 'Login to dist server'
    description = 'Login to dist server'

    async entry(...args: string[]): Promise<number> {
        if (args.length !== 1) {
            console.error('Username required')
            return 1
        }

        const user = args[0]
        console.debug('login: %s', user)

        const answer = await inquirer.prompt([{
            type: 'password',
            prefix: '\x1b[32m' + user + '\x1b[0m',
            name: 'password',
            message: 'password: ',
            mask: '*' as any
        }])

        const res = await api.user.login(user, answer.password)
        if (res.status !== 0) {
            console.error('Login failed: %s', res.message)
            return 1
        }

        console.debug('login success %s : %s', user, res.data)
        const settings = { ...getGlobalSettings() }
        if (!settings.dist) settings.dist = {}
        settings.dist.user = user
        settings.dist.token = res.data

        await mkdir(sideHome, { recursive: true })
        await writeFile(join(sideHome, 'settings'), dump(settings))
        console.debug('settings saved')
        return 0
    }
}