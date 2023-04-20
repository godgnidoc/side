/** 优先导入日志模块，初始化日志环境 */
import { SetLogLevel } from "./logging"

/** 初始化全局设置 */
import { SideRevision, SideVersion, settings } from "./environment"

/** 导入外部依赖 */
import { exit } from "process"
import { Application, Feature, defaultCompleteFeature, defaultHelpFeature, execute } from "@godgnidoc/decli"

/** 导入各功能模块 */
import { project } from "./project"

class Side implements Application {
    name = "side"
    version = SideVersion
    brief = "Smooth Integration Development Environment"
    description = "Create, build, test and release your project with ease."
    options = settings
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
                console.log(`side - ${SideVersion} - ${SideRevision}`)
                return 0
            }
        },

        project,
        ... project
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