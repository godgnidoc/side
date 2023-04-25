import { runInNewContext } from "vm"
import * as yaml from 'js-yaml'
import { Args, Brief, Compgen, Complete, Feature, ShortOpt } from "@godgnidoc/decli"
import { readAllInput } from "./io"
import { mkdir, readFile, writeFile } from "fs/promises"
import { dirname } from "path"

function completeFile(editing: boolean, args: string[]) {
    const prefix = editing ? args[0] : ''
    if (args.length > 1 || args.length == 1 && !editing) return []
    return Compgen('file', prefix)
}

async function inputFrom(file = '-') {
    if (file == '-') return readAllInput()
    try {
        return await readFile(file, 'utf-8')
    } catch (e) {
        console.error('failed to read file %s: %s', file, e.message)
        return undefined
    }
}

async function outputTo(content: string, file = '-') {
    if (file == '-') {
        console.log(content)
    } else {
        await mkdir(dirname(file), { recursive: true })
        await writeFile(file, content)
    }
}

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
        return yaml.load(input)
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
            return yaml.dump(input)
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

export const vgetFeature = new class extends Feature {
    args = true
    brief = 'get value from input'
    description = 'Usage: vget [file] [expression...]\n\n'
        + '  Evaluate the expression on the input and print the result to stdout.\n'
        + '  If the result is invalid, nothing will be printed.\n'
        + '  If the result is an array, the result will be printed as a line-separated list.\n'
        + '  If the result is an object, the result will be printed in "KEY=VALUE" format.\n'
        + '  If the file is "-", the input will be read from stdin.\n'
        + '  The expression will be prefixed with a dot(.) if it does not start with a bracket([).'

    /** 提供命令行补全推荐，为第一个参数推荐文件 */
    complete = completeFile

    async entry(...args: string[]) {
        const input = await inputFrom(args.shift())
        if (!input) return 1

        const origin = vload(input)
        if (!origin) return 1

        const expr = args.join(' ').trim()
        if (!expr) return (console.error('missing expression'), 0)

        const result = vget(origin, expr)
        if (result === undefined) {
            console.verbose('failed to get %s from input', expr)
        } else if (Array.isArray(result)) {
            console.log(result.join('\n'))
        } else if (typeof result === 'object') {
            console.log(Object.entries(result).map(([k, v]) => `${k}=${v}`).join('\n'))
        } else {
            console.log(result)
        }

        return 0
    }
}

class FmtFeature extends Feature {
    args = true
    brief = 'format input as json or yaml'
    description = 'Usage: vfmt [file] [json|yaml]\n\n'
        + '  Format the input as JSON or YAML and print the result to stdout.\n\n'
        + '  If the file is "-", the input will be read from stdin.\n\n'
        + '  If the format is not specified, YAML will be used.'

    /** 提供命令行补全推荐，为第一个参数推荐文件 */
    complete = completeFile

    @ShortOpt('-o')
    @Brief('Specify the output file, if omitted or "-", stdout is used')
    @Args(_arg => true)
    @Complete(arg => Compgen('file', arg))
    outputFile: string = '-'

    async entry(...args: string[]) {
        const input = await inputFrom(args.shift())
        if (!input) return 1

        const format = args.shift() || 'yaml'
        if (format !== 'json' && format !== 'yaml')
            return console.error('invalid format: %s', format), 1

        const origin = vload(input)
        if (!origin) return 1

        let output = vfmt(origin, format)
        await outputTo(output, this.outputFile)

        return 0
    }

}
export const vfmtFeature = new FmtFeature

export const vkeysFeature = new class extends Feature {
    args = true
    brief = 'get keys from input'
    description = 'Usage: vkeys [file] [expr]\n\n'
        + '  Print the keys of the input to stdout.\n\n'
        + '  If the file is "-", the input will be read from stdin.\n\n'
        + '  If the input is an array, the index of each element will be printed.\n'
        + '  If the input is an object, the keys of the object will be printed.'

    /** 提供命令行补全推荐，为第一个参数推荐文件 */
    complete = completeFile

    async entry(...args: string[]) {
        const input = await inputFrom(args.shift())
        if (!input) return 1

        const expr = args.join(' ').trim()

        const origin = vload(input)
        if (!origin) return 1

        console.log(vkeys(origin, expr).join('\n'))
        return 0
    }
}

export const vhasFeature = new class extends Feature {
    args = true
    brief = 'check if input has specified sub expression'
    description = 'Usage: vhas [file] [expr]\n\n'
        + '  Check if the input has the specified expression.\n\n'
        + '  If the file is "-", the input will be read from stdin.'

    /** 提供命令行补全推荐，为第一个参数推荐文件 */
    complete = completeFile

    async entry(...args: string[]) {
        const input = await inputFrom(args.shift())
        if (!input) return console.log(false), 1

        const expr = args.shift().trim()

        const origin = vload(input)
        if (!origin) return (console.log(false), 1)

        const res = vhas(origin, expr)
        console.log(res)
        return res ? 0 : 1
    }
}

class VsetFeature extends Feature {
    args = true
    brief = 'set value to input'
    description = 'Usage: vset [file] [key] = [value]\n\n'
        + '  Set the value of the specified key to the input.\n\n'
        + '  If the file is "-", the input will be read from stdin.'

    /** 输出路径选项，默认为 '-' 表示输出到标准输出流 */
    @ShortOpt('-o')
    @Brief('Specify the output file, if omitted or "-", stdout is used')
    @Args(_arg => true)
    @Complete(arg => Compgen('file', arg))
    outputFile: string = '-'

    /** 输出格式选项，默认为yaml */
    @ShortOpt('-f')
    @Brief('Specify the output format, json or yaml, default is yaml')
    @Args(['json', 'yaml'])
    format: 'json' | 'yaml' = 'yaml'

    /** 提供命令行补全推荐，为第一个参数推荐文件 */
    complete = completeFile

    async entry(...args: string[]) {
        const input = await inputFrom(args.shift())
        if (!input) return 1

        const format = this.format
        if (format !== 'json' && format !== 'yaml')
            return console.error('invalid format: %s', format), 1

        const expr = args.join(' ').trim()
        if (!expr) return (console.error('missing expression'), 1)

        const origin = vload(input)
        if (!origin || !expr) return 1

        const result = vset(origin, expr)
        if (!result) return 1

        const output = vfmt(result, this.format)
        await outputTo(output, this.outputFile)

        return 0
    }
}
export const vsetFeature = new VsetFeature

class VdelFeature extends Feature {
    args = true
    brief = 'delete key from input'
    description = 'Usage: vdel [file] [key]\n\n'
        + '  Delete the specified key from the input.\n\n'
        + '  If the file is "-", the input will be read from stdin.'

    /** 输出路径选项，默认为 '-' 表示输出到标准输出流 */
    @ShortOpt('-o')
    @Brief('Specify the output file, if omitted or "-", stdout is used')
    @Args(_arg => true)
    @Complete(arg => Compgen('file', arg))
    outputFile: string = '-'

    /** 输出格式选项，默认为yaml */
    @ShortOpt('-f')
    @Brief('Specify the output format, json or yaml, default is yaml')
    @Args(['json', 'yaml'])
    format: 'json' | 'yaml' = 'yaml'

    /** 提供命令行补全推荐，为第一个参数推荐文件 */
    complete = completeFile

    async entry(...args: string[]) {
        const input = await inputFrom(args.shift())
        if (!input) return 1

        const format = this.format
        if (format !== 'json' && format !== 'yaml')
            return console.error('invalid format: %s', format), 1

        const key = args.shift().trim()
        if (!key) return (console.error('missing key'), 1)

        const origin = vload(input)
        if (!origin || !key) return 1

        const result = vdel(origin, key)
        if (!result) return 1

        const output = vfmt(result, this.format)
        await outputTo(output, this.outputFile)

        return 0
    }
}
export const vdelFeature = new VdelFeature

class VmergeFeature extends Feature {
    args = true
    brief = 'merge the files'
    description = 'represented by the rest of args on to the file reprented by the first arg'

    /** 输出路径选项，默认为 '-' 表示输出到标准输出流 */
    @ShortOpt('-o')
    @Brief('Specify the output file, if omitted or "-", stdout is used')
    @Args(_arg => true)
    @Complete(arg => Compgen('file', arg))
    outputFile: string = '-'

    /** 输出格式选项，默认为yaml */
    @ShortOpt('-f')
    @Brief('Specify the output format, json or yaml, default is yaml')
    @Args(['json', 'yaml'])
    format: 'json' | 'yaml' = 'yaml'

    /** 命令行补全提示，全部参数均为文件 */
    complete = (editing: boolean, args: string[]) => {
        const prefix = editing ? args.pop() : ''
        return Compgen('file', prefix)
    }

    async entry(...args: string[]) {
        const format = this.format
        if (format !== 'json' && format !== 'yaml')
            return console.error('invalid format: %s', format), 1

        let result = undefined
        for (const arg of args) {
            const input = await inputFrom(arg)
            if (!input) return 1
            const income = vload(input)
            if (!income) return 1
            result = vmerge(result, income)
        }

        const output = vfmt(result, this.format)
        await outputTo(output, this.outputFile)

        return 0
    }
}

export const vmergeFeature = new VmergeFeature