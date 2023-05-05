import { Feature } from "@godgnidoc/decli"
import { api } from "../api"

export const distSearchFeature = new class extends Feature {
    args = '<pattern>'
    brief = 'Search packages'
    description = 'Search packages against specified pattern'

    async entry(pattern?: string) {
        const result = await api.package.search(pattern)
        if (result.status !== 0) {
            console.error('Failed to search packages: %s', result.message)
            return 1
        }

        result.data.forEach(i => console.log(i))
        return 0
    }
}