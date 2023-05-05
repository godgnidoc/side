import { Brief, Feature, LongOpt, ShortOpt } from "@godgnidoc/decli"
import { api } from "../api"

class DistQueryFeature extends Feature {
    args = '<query> [version|range]'
    brief = 'Query package by query and version or range'
    description = 'Query package by query and version or range'

    @Brief('Print all matched packages')
    @LongOpt('--all') @ShortOpt('-a')
    all: boolean = false

    async entry(query: string, version?: string) {
        if (!query) {
            console.error('Query is required')
            return 1
        }

        const result = await api.package.query(query, version)
        if (result.status !== 0) {
            console.error('Failed to search scopes: %s', result.message)
            return 1
        }

        if (this.all) result.data.forEach(i => console.log(i))
        else if (result.data[0]) console.log(result.data[0])
        return 0
    }
}
export const distQueryFeature = new DistQueryFeature