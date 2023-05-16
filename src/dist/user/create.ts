import { Feature } from '@godgnidoc/decli'
import { api } from '../api'
import inquirer from 'inquirer'
import { IsValidName } from 'format'

export const userCreateFeature = new class extends Feature {
    args = '<name> <email>'
    brief = 'Create a user'
    description = 'Create a user'

    async entry(...args: string[]) {
        if (args.length < 2) {
            console.error('Leak of arguments')
            return 1
        }

        const name = args[0]
        const email = args[1]

        // 检查用户名是否合法
        console.verbose('create user: %s %s', name, email)
        if (!IsValidName(name)) {
            console.error('Invalid name')
            return 1
        }

        // 检查用户是否存在
        let res = await api.user.exist(name)
        if (res.status === 0) {
            console.error('User already exists')
            return 1
        }

        // 获取密码并要求重复
        const answer = await inquirer.prompt([
            {
                type: 'password',
                name: 'password',
                message: 'Password: ',
                mask: '*'
            },
            {
                type: 'password',
                name: 'repeat',
                message: 'Repeat password: ',
                mask: '*'
            }
        ])

        // 检查密码是否一致
        if (answer.password !== answer.repeat) {
            console.error('Password not match')
            return 1
        }

        // 创建用户
        res = await api.user.create(name, email, answer.password)
        if (res.status !== 0) {
            console.error('Create user failed: %s', res.message)
            return 1
        }
        return 0
    }
}