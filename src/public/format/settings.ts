/** 资源分发平台相关的设置 */
interface DistSettings {
    /** 接口请求的基础URL http://side.server:port/dist */
    apiBaseUrl?: string

    /** 获取资源包时的ftp基础URL ftp://user:password@host/path */
    ftpBaseUrl?: string

    /** dist 登录用户 */
    user?: string

    /** dist 登录令牌 */
    token?: string
}

interface BasicGlobalSettings {

    /** dist 平台相关设置 */
    dist?: DistSettings
}

interface BasicLocalSettings {
    /**
     * 显式指定各子模块的本地配置
     */
    modules?: {
        [name: string]: {
            /** 强调是否获取此模块，未设置表示遵循目标规则 */
            fetch?: boolean

            /** 允许本地强制指定仓库的检出目标 */
            checkout?: string
        }
    }

    /** dist 平台相关设置 */
    dist?: DistSettings
}

/** Side 全局设置文件的结构定义 */
export interface GlobalSettings extends BasicGlobalSettings {
    $structure: 'side.global-settings'
}

/** 项目局部设置文件结构 */
export interface LocalSettings extends BasicLocalSettings {
    $structure: 'side.local-settings'
}

/** 各级设置文件叠加之后表现的最终设置 */
export interface FinalSettings extends BasicGlobalSettings, BasicLocalSettings {
    $structure: 'side.final-settings'
}