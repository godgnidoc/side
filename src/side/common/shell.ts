import { Feature } from "@godgnidoc/decli"
import { spawn } from "child_process"
import { fullyInflateEnv } from "environment"

export const shellFeature = new class extends Feature {
    args = '<command...>'
    brief = "Run a shell command in the project environment"
    description = "Run a shell command in the project environment"
    async entry(...args: string[]) {
        const cmd = args.join(' ')
        fullyInflateEnv()
        const cp = spawn(cmd, { shell: '/bin/bash', stdio: 'inherit' })
        return new Promise<number>((resolve) => cp.on('exit', (code) => resolve(code)))
    }
}