import { Feature } from "@godgnidoc/decli"
import { IsValidName } from "../../utils"
import { api } from "../api"
import inquirer from "inquirer"

export const userCreateFeature = new class extends Feature {
    args = true
    brief = 'Create a user'
    description = 'Usage: dist create user <name> <email>'

    async entry(...args: string[]) {
        if (args.length < 2) {
            console.error('Leak of arguments')
            return 1
        }

        const name = args[0]
        const email = args[1]

        console.debug('create user: %s %s', name, email)
        if (!IsValidName(name)) {
            console.error('Invalid name')
            return 1
        }

        let res = await api.user.exist(name)
        if (res.status === 0) {
            console.error('User already exists')
            return 1
        }

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

        if (answer.password !== answer.repeat) {
            console.error('Password not match')
            return 1
        }

        res = await api.user.create(name, email, answer.password)
        if (res.status !== 0) {
            console.error('Create user failed: %s', res.message)
            return 1
        }
        return 0
    }
}