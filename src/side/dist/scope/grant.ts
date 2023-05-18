import { Feature } from "@godgnidoc/decli"
import { api } from "dist/api"

export const scopeGrantFeature = new class extends Feature {
    args = '<scope> <user>...'
    brief = 'Grant specified users to the scope'
    description = `Grant specified users to the scope`

    async entry(scope: string, ...users: string[]) {
        let correct = true
        for (const user of users) {
            const result = await api.scope.grant(scope, user)
            if (result.status !== 0) {
                console.error('grant %s to %s failed: %s', scope, user, result.message)
                correct = false
            } else {
                console.info('grant %s to %s success', scope, user)
            }
        }

        return correct ? 0 : 1
    }
}