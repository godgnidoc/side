/** 优先导入日志模块，初始化日志环境 */
import { SetLogLevel } from "./environment/logging"

/** 初始化全局设置 */
import { sideRevision, sideVersion, globalOptions } from "./environment"

/** 导入外部依赖 */
import { exit } from "process"
import { Application, Feature, defaultCompleteFeature, defaultHelpFeature, execute } from "@godgnidoc/decli"

/** 导入各功能模块 */
import { project } from "./project"
import { spawn } from "child_process"

class Side implements Application {
    name = "side"
    version = sideVersion
    brief = "Smooth Integration Development Environment"
    description = "Create, build, test and release your project with ease."
    options = globalOptions
    help = 'help'

    elements = {
        "complete": defaultCompleteFeature,
        "help": defaultHelpFeature,
        "--help": defaultHelpFeature,
        "-h": defaultHelpFeature,
        "--version": new class extends Feature {
            brief = "Show version information"
            description = "Show version information"
            entry() {
                console.log(`side - ${sideVersion} - ${sideRevision}`)
                return 0
            }
        },
        "shell": new class extends Feature {
            brief = "Run a shell command in the project environment"
            description = "Run a shell command in the project environment"
            args = true
            async entry(...args: string[]) {
                const cmd = args.join(' ')
                const cp = spawn(cmd, { shell: '/bin/bash', stdio: 'inherit' })
                return new Promise<number>((resolve) => cp.on('exit', (code) => resolve(code)))
            }
        },

        project,
        ...project
    }

    entry() {
        SetLogLevel(this.options.logging)
        return 0
    }
}

const app = new Side()
execute(app, process.argv.slice(2)).then((ret) => {
    exit(ret)
}).catch((err) => {
    console.error(err)
    exit(-1)
})