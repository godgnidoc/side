export type SimpleExport = string | number | boolean | string[]

export interface ComplexExport {
    /** 是否覆盖原有变量，若值为数组，默认为 false 否则强制为 true */
    override?: boolean

    /** 字段分割符，默认为冒号 */
    delimiter?: string

    /** 字段位置，默认为前置 */
    position?: 'front' | 'back'

    /** 字段值 */
    value: string | number | boolean | string[]
}

/** 
 * 环境变量表
 * 若值为字符串、数字或布尔值，则默认为覆盖原有变量
 * 若值为数组，则默认为不覆盖原有变量
 * 若字符串或字符串数组包含'${...}'语法，则会被视为环境变量引用，会被自动替换为对应的环境变量值
 * 
 * @schema Exports
 */
export interface Exports {
    [key: string]: ComplexExport | SimpleExport
}