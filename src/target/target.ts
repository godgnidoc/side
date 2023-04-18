export interface Target {
    /** 项目名称 */
    project?: string

    /** 集成开发环境引擎版本号 */
    engine?: string

    /** 当前目标所继承的目标的名称 */
    inherit?: string

    /** 当前目标所聚合的目标名称 */
    composite?: string[]

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

    /** 启用目标是应当导出的环境变量定义 */
    params?: { [key: string]: string }
}