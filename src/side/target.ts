import { Feature } from "@godgnidoc/decli"
import { Project } from "project"

const targets = new class extends Feature {
    args = ''
    brief = 'List all targets'
    description = 'List all targets'

    async entry() {
        const project = Project.This()
        if (!project) return 1

        const targets = await project.listTargets()
        for (const target of targets) {
            console.log(target)
        }
        return 0
    }
}

export const targetFeatures = {
    targets,
}