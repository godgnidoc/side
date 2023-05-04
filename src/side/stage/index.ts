import { writeFileSync } from "fs"
import { loadFinalTarget, projectPath, rpaths } from "environment"
import { join } from "path"
import { dump } from "js-yaml"
import { Stage } from "format"

export function getCurrentStage() {
    return loadFinalTarget()?.stage
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
    const target = loadFinalTarget()
    target.stage = stage
    writeFileSync(join(projectPath, rpaths.projectFinalTarget), dump(target))
}