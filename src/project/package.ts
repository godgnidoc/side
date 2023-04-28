import { Feature } from "@godgnidoc/decli"
import { invokeHook } from "../common/invoke_hook"
import { loadFinalTarget } from "../environment"
import { setStage, testStage } from "../stage"
import { projectBuildFeature } from "./build"

export const projectPackageFeature = new class extends Feature {
    brief = 'Package project'
    description = 'Package project'

    async entry(...args: string[]): Promise<number> {
        console.debug('package:', args)
        const target = loadFinalTarget()
        if (!target) {
            console.error('No target specified')
            return 1
        }
        if (!testStage('built')) {
            if (0 !== await projectBuildFeature.entry()) return 1
        }

        if (0 !== await invokeHook('pre-package', args)) return 1
        if (0 !== await invokeHook('package', args)) return 1
        if (0 !== await invokeHook('post-package', args)) return 1

        setStage('packaged')
        return 0
    }   
}