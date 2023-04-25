import { ProjectAspect, ProjectTarget } from "../format";
import * as yaml from 'js-yaml'
import { readFile } from "fs/promises";
import { join } from "path";
import { projectPath, rpaths } from "../environment";

export async function calculateTarget(target: string, fmt: 'target' | 'aspect' = 'target') {
    const file = join(projectPath, rpaths.projectTargets, fmt + '-' + target)
    const targets: string[] = []
    let source: string

    // 尝试加载目标文件
    try {
        source = await readFile(file, 'utf-8')
    } catch (e) {
        console.error(`Failed to load %s file %s`, fmt, target)
        return undefined
    }

    const manifest = yaml.load(source) as ProjectAspect | ProjectTarget
    if (manifest.$structure == 'side.target') {
        if (fmt != 'target') {
            console.error(`Unexpected target file: ${target}`)
            return undefined
        }

        // 追加继承的目标
        if (typeof manifest.inherit === 'string') {
            const inherits = await calculateTarget(manifest.inherit, 'target')
            if (!inherits) return undefined
            targets.push(...inherits)
        }

        // 追加聚合的切面
        if (manifest.composites instanceof Array) {
            for (const composite of manifest.composites) {
                const composites = await calculateTarget(composite, 'aspect')
                if (!composites) return undefined
                targets.push(...composites)
            }
        }
    } else if (manifest.$structure == 'side.aspect') {
        if (fmt != 'aspect') {
            console.error(`Unexpected aspect file: ${target}`)
            return undefined
        }

        // 切面文件不支持继承也不支持聚合
    } else {
        console.error(`Invalid target file: ${target}`)
        return undefined
    }

    targets.push(file)

    return targets
}