import { Feature } from "@godgnidoc/decli";
import { getFinalTarget, projectName } from "../environment";

export const statusFeature = new class extends Feature {
    brief = 'Show project status'
    description = 'Show project status'

    async entry(): Promise<number> {
        console.debug('status')
        if (!projectName) return 0
        let first = projectName
        let suffix = process.stdout.isTTY ? '\x1b[0m' : ''
        let prefix1 = process.stdout.isTTY ? '\x1b[1;36m' : ''

        const target = getFinalTarget()
        let prefix2 = process.stdout.isTTY
            ? target
                ? prefix1
                : '\x1b[1;33m'
            : ''
        let second = target ? target.target : 'no target'
        let third = target ? target.stage : 'no stage'

        console.log(`[${prefix1}${first}${suffix} : ${prefix2}${second}${suffix} : ${prefix2}${third}${suffix}]`)
        return 0
    }
}