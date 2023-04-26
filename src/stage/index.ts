import { writeFileSync } from "fs"
import { getFinalTarget, projectPath, rpaths } from "../environment"
import { join } from "path"
import { dump } from "js-yaml"

export type Stage = 'draft' | 'ready' | 'built' | 'packaged'

export function getCurrentStage() {
    return getFinalTarget()?.stage
}

export function testStage(stage: Stage) {
    const order: Stage[] = ['draft', 'ready', 'built', 'packaged']
    const current = getCurrentStage()
    const oc = order.indexOf(current)
    const os = order.indexOf(stage)
    let op =  oc > os
        ? '>'
        : oc < os
            ? '<'
            : '=='
    console.debug('stage: (current) %s %s %s (target)', current, op, stage)
    if( !current ) return false
    return oc >= os
}

export function setStage(stage: Stage) {
    console.debug('stage: set to %s', stage)
    const target = getFinalTarget()
    target.stage = stage
    writeFileSync(join(projectPath, rpaths.projectFinalTarget), dump(target))
}