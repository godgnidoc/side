import { Feature } from '@godgnidoc/decli'
import { api } from 'dist/api'

export const repoWhichFeature = new class extends Feature {
    args = '<usage>'
    brief = 'Ask which repo is used by the specified usage'
    description = 'Ask which repo is used by the specified usage'

    async entry(...args: string[]) {
        if (args.length !== 1) {
            console.error('Leak of arguments')
            return 1
        }

        const usage = args[0]
        const res = await api.repo.which(usage)

        if (res.status !== 0) {
            console.error('Failed query repo by usage %s: %s', usage, res.message)
            return 1
        }

        console.log(res.data)
        return 0
    }
}