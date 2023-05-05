import { Feature } from "@godgnidoc/decli"
import { api } from "../api"

export const distScopesFeature = new class extends Feature {
    args = '<pattern>'
    brief = 'Search scopes'
    description = 'Search scopes against specified pattern'

    async entry(pattern?: string) {
        const result = await api.scope.search(pattern)
        if (result.status !== 0) {
            console.error('Failed to search scopes: %s', result.message)
            return 1
        }

        result.data.forEach(i => console.log(i))
        return 0
    }
}