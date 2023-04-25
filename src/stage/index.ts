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
    if( !current ) return false
    return order.indexOf(current) >= order.indexOf(stage)
}

export function setStage(stage: Stage) {
    const target = getFinalTarget()
    target.stage = stage
    writeFileSync(join(projectPath, rpaths.projectFinalTarget), dump(target))
}