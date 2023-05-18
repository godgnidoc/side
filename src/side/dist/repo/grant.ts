import { Feature } from "@godgnidoc/decli"
import { api } from "dist/api"

export const repoGrantFeature = new class extends Feature {
    args = '<repo> <user>...'
    brief = 'Grant specified users to the repo'
    description = `Grant specified users to the repo`

    async entry(repo: string, ...users: string[]) {
        let correct = true
        for (const user of users) {
            const result = await api.repo.grant(repo, user)
            if (result.status !== 0) {
                console.error('grant %s to %s failed: %s', repo, user, result.message)
                correct = false
            } else {
                console.info('grant %s to %s success', repo, user)
            }
        }

        return correct ? 0 : 1
    }
}