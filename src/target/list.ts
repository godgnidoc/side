import { join } from "path"
import { settings } from "../environment/settings"
import { readdir } from "fs/promises"

/**
 * 从.project/targets文件夹中读取所有目标的名字
 * 目标文件名格式 target-<目标名>
 */
export async function listTargets() {
    const targets = await readdir(join(settings.workspace, '.project', 'targets'))
    return targets.map((target) => target.replace('target-', ''))
}
