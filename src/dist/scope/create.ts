import { Feature } from '@godgnidoc/decli'
import { api } from '../api'
import { IsValidScope } from 'format'

export const scopeCreateFeature = new class extends Feature {
    args = '<name>'
    brief = 'Create a scope'
    description = 'Create a scope'

    async entry(...args: string[]) {
        if (args.length !== 1) {
            console.error('Leak of arguments')
            return 1
        }

        const name = args[0]

        // 检查作用域名是否合法
        console.verbose('create scope: %s', name)
        if (!IsValidScope(name)) {
            console.error('Invalid scope name')
            return 1
        }

        // 尝试创建作用域
        const res = await api.scope.create(name)
        if (res.status !== 0) {
            console.error('Create scope failed: %s', res.message)
            return 1
        }

        return 0
    }
}