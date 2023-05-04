import { Feature } from "@godgnidoc/decli";
import { projectPath, rpaths } from "environment";
import { readdir } from "fs/promises";
import { join } from "path";

export async function getTargetList() {
    try {
        const list: string[] = []
        const prefix = 'target-'
        for (const file of await readdir(join(projectPath, rpaths.projectTargets), { withFileTypes: true })) {
            if (file.isFile() && file.name.startsWith(prefix))
                list.push(file.name.slice(prefix.length))
        }
        return list
    } catch (e) {
        console.debug('Failed to list target', e)
        return []
    }
}

class ListTargetFeature extends Feature {
    brief = "List all targets"
    description = "List all targets"

    async entry() {
        const list = await getTargetList()
        console.log(list.join('\n'))
        return list.length == 0 ? 1 : 0
    }
}

export const listTargetFeature = new ListTargetFeature()