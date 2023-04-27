import { Feature, ShortOpt } from "@godgnidoc/decli"
import { loadFinalTarget, projectName, projectPath } from "../environment"
import { ChildProcess, ChildProcessWithoutNullStreams, spawn } from "child_process"

class StatusFeature extends Feature {
    brief = 'Show project status'
    description = 'Show project status'

    @ShortOpt('-s')
    short = false

    @ShortOpt('-n')
    noGit = false

    async entry(): Promise<number> {
        console.debug('status')
        if (!projectName) return 0
        let first = projectName
        let suffix = process.stdout.isTTY ? '\x1b[0m' : ''
        let prefix1 = process.stdout.isTTY ? '\x1b[1;36m' : ''

        const target = loadFinalTarget()
        let prefix2 = process.stdout.isTTY
            ? target
                ? prefix1
                : '\x1b[1;33m'
            : ''
        let second = target ? target.target : 'no target'
        let third = target ? target.stage : 'no stage'

        let ch: ChildProcess | ChildProcessWithoutNullStreams
        if (this.short) {
            console.log(`${prefix1}${first}${suffix} : ${prefix2}${second}${suffix} : ${prefix2}${third}${suffix}`)
            if (!this.noGit) spawn('git', ['status', '-s'], { stdio: 'inherit' })
        } else {
            if (target) {
                process.stdout.write(`Project ${prefix1}${first}${suffix} with target ${prefix2}${second}${suffix} and stage ${prefix2}${third}${suffix}`)
            } else {
                process.stdout.write(`Project ${prefix1}${first}${suffix} ${prefix2}without target${suffix}`)
            }
            if (this.noGit) {
                process.stdout.write('\n')
            } else {
                const color = process.stdout.isTTY
                    ? '-c color.status=always'
                    : ''
                ch = spawn(`git ${color} status`, {
                    stdio: ['inherit', 'pipe', 'inherit'], shell: '/bin/bash', cwd: projectPath
                })
                ch.stdout.once('data', (data) => {
                    let lines: string = data.toString()
                    
                    if (lines.startsWith('On branch')) {
                        lines = lines
                            .replace(/On branch (.*)\n/, 'on branch \x1b[1;36m$1\x1b[0m\n')
                            .replace(/ahead of '(.*)' by (\d+)/, "ahead of \x1b[1;36m'$1'\x1b[0m by \x1b[33m$2\x1b[0m")
                            .replace(/date with '(.*)'/, "date with \x1b[1;36m'$1'\x1b[0m")
                            .replace(/behind '(.*)' by (\d+) commit/, "behind \x1b[1;36m'$1'\x1b[0m by \x1b[1;33m$2\x1b[0m commit")
                            .replace(/use "(.*)" to/g, 'use \x1b[1;32m"$1"\x1b[0m to')
                        process.stdout.write(', ' + lines)
                    } else {
                        process.stdout.write('\n')
                    }
                    ch.stdout.pipe(process.stdout)
                })
            }
        }

        if (!ch) return 0
        return new Promise<number>((resolve) => {
            ch.on('exit', (code) => {
                resolve(code || 0)
            })
        })
    }
}
export const statusFeature = new StatusFeature