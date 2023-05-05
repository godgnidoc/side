import { Feature } from "@godgnidoc/decli"
import { api } from "../api"

export const distReposFeature = new class extends Feature {
    args = '<pattern>'
    brief = 'Search repos'
    description = 'Search repos against specified pattern'

    async entry(pattern?: string) {
        const result = await api.repo.search(pattern)
        if (result.status !== 0) {
            console.error('Failed to search repos: %s', result.message)
            return 1
        }

        result.data.forEach(i => console.log(i))
        return 0
    }
}