import { Brief, Feature, ShortOpt } from "@godgnidoc/decli"
import { ChildProcess, ChildProcessWithoutNullStreams, spawn } from "child_process"
import { Project } from "project"

class StatusFeature extends Feature {
    brief = 'Show project status'
    description = 'Show project status'

    @ShortOpt('-s')
    @Brief('make output short')
    short = false

    @ShortOpt('-n')
    @Brief('do not show git status')
    noGit = false

    async entry(): Promise<number> {
        console.debug('status')
        const pstat = Project.Stat(process.cwd())
        if (!pstat.name) return 0
        let first = pstat.name
        let suffix = process.stdout.isTTY ? '\x1b[0m' : ''
        let prefix1 = process.stdout.isTTY ? '\x1b[1;36m' : ''

        let prefix2 = process.stdout.isTTY
            ? pstat.target
                ? prefix1
                : '\x1b[1;33m'
            : ''
        let second = pstat.target ?? 'no target'
        let third = pstat.stage ?? 'no stage'

        let ch: ChildProcess | ChildProcessWithoutNullStreams
        if (this.short) {
            console.log(`${prefix1}${first}${suffix} : ${prefix2}${second}${suffix} : ${prefix2}${third}${suffix}`)
            if (!this.noGit) spawn('git', ['status', '-s'], { stdio: 'inherit' })
        } else {
            if (pstat.target) {
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
                    stdio: ['inherit', 'pipe', 'inherit'], shell: '/bin/bash', cwd: Project.This().path
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
                            .replace(/use "(.*)" and\/or "(.*)"/g, 'use \x1b[1;32m"$1"\x1b[0m and/or \x1b[1;32m"$2"\x1b[0m')
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