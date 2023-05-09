import { dump, load } from "js-yaml"
import { runInNewContext } from "vm"


/**
 * 尝试将输入解析为JS/JSON/YAML
 * @param input 输入
 * @returns 解析结果，如果解析失败则返回undefined
 */
export function vload(input: string, feedback = { format: '' }) {
    /** 优先尝试在空上下文将输入当作JS内容执行 */
    try {
        feedback.format = 'js'
        return runInNewContext(`(${input})`, {}, {
            filename: 'vload',
            contextName: 'vload',
            displayErrors: false
        })
    } catch {
        console.verbose('failed to load input as js/json, try yaml')
    }

    // 如果失败则尝试当做YAML解析
    try {
        feedback.format = 'yaml'
        return load(input)
    } catch {
        console.verbose('failed to load input as yaml')
    }

    console.error('failed to load input as js/json/yaml')
    return undefined
}

/**
 * 尝试将输入格式化为JSON或YAML
 */
export function vfmt(input: any, f: 'json' | 'yaml' = 'yaml') {
    switch (f) {
        case 'json':
            return JSON.stringify(input, null, 4)
        case 'yaml':
            return dump(input)
    }
}

/**
 * 尝试从输入中获取指定表达式的值
 * @param input 输入
 * @param expr 表达式
 * @returns 表达式的值，如果获取失败则返回undefined
 */
export function vget(input: any, expr: string) {
    expr = expr ? expr.trim() : ''
    if (!expr) return input
    if (!expr.startsWith('[')) expr = '.' + expr
    try {
        return runInNewContext(`(input${expr})`, { input }, {
            filename: 'vget',
            contextName: 'vget',
            displayErrors: false
        })
    } catch (e) {
        console.verbose('failed to get %s from input: %s', expr, e.message)
    }
}

/**
 * 尝试获取输入的所有键
 * @param input 输入
 * @returns 输入的所有键，如果获取失败则返回空数组
 */
export function vkeys(input: any, expr = '') {
    input = vget(input, expr)
    if (typeof input !== 'object') return []
    if (Array.isArray(input)) return input.map((_, i) => i)
    return Object.keys(input)
}

/**
 * 判断输入是否包含指定键
 * @param input 输入
 * @param expr 表达式
 * @returns 如果包含则返回true，否则返回false
 */
export function vhas(input: any, expr: string) {
    input = vget(input, expr)
    return input !== undefined
}

/**
 * 尝试在输入上执行表达式
 * @param input 输入
 * @param expr 表达式
 * @returns 输入，如果执行失败则返回undefined
 */
export function vset(input: any, expr: string) {
    expr = expr ? expr.trim() : ''
    if (!expr) return input
    if (!expr.startsWith('[')) expr = '.' + expr
    try {
        runInNewContext(`(input${expr})`, { input }, {
            filename: 'vset',
            contextName: 'vset',
            displayErrors: false
        })
        return input
    } catch {
        console.error('failed to set %s on input', expr)
        return undefined
    }
}

/**
 * 尝试在输入上删除指定键
 * @param input 输入
 * @param expr 子表达式
 * @returns 输入，如果删除失败则返回undefined
 */
export function vdel(input: any, expr: string) {
    expr = expr ? expr.trim() : ''
    if (!expr) return input
    if (!expr.startsWith('[')) expr = '.' + expr
    try {
        runInNewContext(`delete input${expr}`, { input }, {
            filename: 'vdel',
            contextName: 'vdel',
            displayErrors: false
        })
    } catch (e) {
        console.verbose('failed to delete %s from input: %s', expr, e.message)
    }
    return input
}

/**
 * 尝试将RHS覆盖到LHS上  
 * - 若二者均为对象，则递归合并
 * - 若二者均为数组，则合并数组
 * - 否则直接覆盖
 * @param lhs LHS
 * @param rhs RHS
 * @returns 合并结果，如果合并失败则返回undefined
 */
export function vmerge(lhs: any, rhs: any) {
    if (typeof lhs !== 'object' || typeof rhs !== 'object') return rhs
    if (Array.isArray(lhs) && Array.isArray(rhs)) {
        lhs.push(...rhs)
        return lhs
    }
    for (const key in rhs) {
        lhs[key] = vmerge(lhs[key], rhs[key])
    }
    return lhs
}