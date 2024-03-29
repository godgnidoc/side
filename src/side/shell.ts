import { Feature } from '@godgnidoc/decli'
import { spawn } from 'child_process'
import { inflate } from 'inflate'
import { SidePlatform } from 'platform'
import { Project } from 'project'

export const shellFeature = new class extends Feature {
    args = '<command...>'
    brief = 'Run a shell command in the project environment'
    description = 'Run a shell command in the project environment'
    async entry(...args: string[]) {
        let cmd = args.join(' ')

        if (!cmd.trim()) cmd = 'bash'

        const exports = Project.This()?.exports ?? SidePlatform.exports
        const cp = spawn(cmd, { shell: '/bin/bash', stdio: 'inherit', env: inflate(exports) })
        return new Promise<number>((resolve) => cp.on('exit', (code) => resolve(code)))
    }
}