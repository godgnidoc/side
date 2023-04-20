import { Exports } from "../environment/inflate"

/**
 * 项目配置清单文件结构
 * 此结构适用于项目清单、目标清单、切面清单
 */
export interface ProjectManifest {
    /** 项目名称 */
    project?: string

    /** 当前目标名 */
    target?: string

    /** 集成开发环境引擎版本号 */
    engine?: string

    /** 当前目标所继承的目标的名称 */
    inherit?: string

    /** 当前目标所聚合的目标名称 */
    composites?: string[]

    /** 当前目标所依赖的包 */
    requires?: { [key: string]: string } // query -> version

    /** 当前项目的子项目 */
    modules?: {
        [name: string]: {
            /** 子项目仓库路径 */
            repo?: string

            /** 检出目标分支或TAG */
            checkout?: string
        }
    }

    /** 启用目标时应当导出的环境变量定义 */
    exports?: Exports
}