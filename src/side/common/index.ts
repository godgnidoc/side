import { invokeHookFeature } from "./invoke_hook"
import { vdelFeature, vfmtFeature, vgetFeature, vhasFeature, vkeysFeature, vmergeFeature, vsetFeature } from "./notion"
import { shellFeature } from "./shell"
import { statusFeature } from "./status"

export { vload, vfmt, vget, vset, vhas, vdel, vkeys, vmerge } from './notion'
export { getRevision } from './git'

export const common = {
    vget: vgetFeature,
    vfmt: vfmtFeature,
    vkeys: vkeysFeature,
    vhas: vhasFeature,
    vset: vsetFeature,
    vdel: vdelFeature,
    vmerge: vmergeFeature,
    status: statusFeature,
    invoke: invokeHookFeature,
    shell: shellFeature,
}