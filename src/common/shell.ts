import { Feature } from "@godgnidoc/decli"
import { spawn } from "child_process"

export const shellFeature = new class extends Feature {
    brief = "Run a shell command in the project environment"
    description = "Run a shell command in the project environment"
    args = true
    async entry(...args: string[]) {
        const cmd = args.join(' ')
        const cp = spawn(cmd, { shell: '/bin/bash', stdio: 'inherit' })
        return new Promise<number>((resolve) => cp.on('exit', (code) => resolve(code)))
    }
}