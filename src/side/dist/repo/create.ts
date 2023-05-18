import { Feature } from '@godgnidoc/decli'
import { api } from 'dist/api'
import { PackageId } from 'format'

export const repoCreateFeature = new class extends Feature {
    args = '<repo-id>'
    brief = 'Create a repo'
    description = 'Create a repo'

    async entry(...args: string[]) {
        if (args.length !== 1) {
            console.error('Leak of arguments')
            return 1
        }

        const id = args[0]
        const pid = PackageId.FromRepoId(id)
        if (pid instanceof Error) {
            console.error('Invalid repo id: %s', id)
            return 1
        }

        // 尝试创建仓库
        const res = await api.repo.create(pid.repoId)
        if (res.status !== 0) {
            console.error('Create scope failed: %s', res.message)
            return 1
        }

        return 0
    }
}