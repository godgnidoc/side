import { Brief, Feature, LongOpt, ShortOpt } from "@godgnidoc/decli"
import { QueryPackage } from "./common"
import { parse } from "semver"

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

        const semv = parse(version)

        const result = await QueryPackage(query, semv)
        if (this.all) result.forEach(i => console.log(i))
        else if (result[0]) console.log(result[0])
        return 0
    }
}
export const distQueryFeature = new DistQueryFeature