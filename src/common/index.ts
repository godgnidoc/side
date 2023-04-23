import { vdelFeature, vfmtFeature, vgetFeature, vhasFeature, vkeysFeature, vmergeFeature, vsetFeature } from "./notion";
import { shellFeature } from "./shell";
import { versionFeature } from "./version";

export { vload, vfmt, vget, vset, vhas, vdel, vkeys, vmerge } from './notion'

export const common = {
    shell: shellFeature,
    '--version': versionFeature,
    vget: vgetFeature,
    vfmt: vfmtFeature,
    vkeys: vkeysFeature,
    vhas: vhasFeature,
    vset: vsetFeature,
    vdel: vdelFeature,
    vmerge: vmergeFeature,
}