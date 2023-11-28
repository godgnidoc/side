import { Args, Brief, Compgen, Complete, Feature, ShortOpt } from '@godgnidoc/decli'
import { vdel, vfmt, vget, vhas, vkeys, vload, vmerge, vset } from 'notion'
import { inputFrom, outputTo } from './common'
import { runInNewContext } from 'vm'

function completeFile(editing: boolean, args: string[]) {
    const prefix = editing ? args[0] : ''
    if (args.length > 1 || args.length == 1 && !editing) return []
    return Compgen('file', prefix)
}

export const vgetFeature = new class extends Feature {
    args = '<file|-> [expression...]'
    brief = 'get value from input'
    description = 'Evaluate the expression on the input and print the result to stdout.\n'
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
    args = '<file|-> [json|yaml]'
    brief = 'format input as json or yaml'
    description = 'Format the input as JSON or YAML and print the result to stdout.\n\n'
        + '  If the file is "-", the input will be read from stdin.\n\n'
        + '  If the format is not specified, YAML will be used.'

    /** 提供命令行补全推荐，为第一个参数推荐文件 */
    complete = completeFile

    @ShortOpt('-o')
    @Brief('Specify the output file, if omitted or "-", stdout is used')
    @Args(_arg => true)
    @Complete(arg => Compgen('file', arg))
    outputFile = '-'

    async entry(...args: string[]) {
        const input = await inputFrom(args.shift())
        if (!input) return 1

        const format = args.shift() || 'yaml'
        if (format !== 'json' && format !== 'yaml')
            return console.error('invalid format: %s', format), 1

        const origin = vload(input)
        if (!origin) return 1

        const output = vfmt(origin, format)
        await outputTo(output, this.outputFile)

        return 0
    }

}
export const vfmtFeature = new FmtFeature()

export const vkeysFeature = new class extends Feature {
    args = '<file|-> [expression...]'
    brief = 'get keys from input'
    description = 'Print the keys of the input to stdout.\n\n'
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
    args = '<file|-> [expression...]'
    brief = 'check if input has specified sub expression'
    description = 'Check if the input has the specified expression.\n\n'
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
    args = '<file|-> [expression...] = [value]'
    brief = 'set value to input'
    description = 'Evaluate the assignment expression on the input and print the result to stdout.\n\n'
        + '  If the file is "-", the input will be read from stdin.'

    /** 输出路径选项，默认为 '-' 表示输出到标准输出流 */
    @ShortOpt('-o')
    @Brief('Specify the output file, if omitted or "-", stdout is used')
    @Args(_arg => true)
    @Complete(arg => Compgen('file', arg))
    outputFile = '-'

    @ShortOpt('-i')
    @Brief('Modify the input file directly')
    inplace = false


    /** 输出格式选项，默认为yaml */
    @ShortOpt('-f')
    @Brief('Specify the output format, json or yaml, default to the same as input')
    @Args(['json', 'yaml'])
    format: 'json' | 'yaml'

    /** 提供命令行补全推荐，为第一个参数推荐文件 */
    complete = completeFile

    async entry(...args: string[]) {
        const source = args.shift()
        if (this.inplace) {
            if (source === '-') {
                console.error('cannot modify stdin')
                return 1
            }

            if (this.outputFile !== '-') {
                console.error('cannot specify output file when modify input file directly')
                return 1
            }

            this.outputFile = source
        }

        const input = await inputFrom(source)
        if (!input) return 1

        if (this.format && !['json', 'yaml'].includes(this.format))
            return console.error('invalid format: %s', this.format), 1

        let expr = args.join(' ').trim()
        if (!expr) return (console.error('missing expression'), 1)

        if (expr.includes('=')) {
            const [key, value] = expr.split('=')
            try {
                runInNewContext(`(${value})`)
            } catch (e) {
                expr = `${key} = ${JSON.stringify(value.trim())}`
            }
        }

        const feedback = { format: this.format }
        const origin = vload(input, feedback)
        if (!origin || !expr) return 1
        if(this.format) feedback.format = this.format

        const result = vset(origin, expr)
        if (!result) return 1

        const output = vfmt(result, feedback.format)
        await outputTo(output, this.outputFile)

        return 0
    }
}
export const vsetFeature = new VsetFeature()

class VdelFeature extends Feature {
    args = '<file|-> [expression...]'
    brief = 'delete key from input'
    description = 'Delete the specified expression on the input and print the result to stdout.\n\n'
        + '  If the file is "-", the input will be read from stdin.'

    /** 输出路径选项，默认为 '-' 表示输出到标准输出流 */
    @ShortOpt('-o')
    @Brief('Specify the output file, if omitted or "-", stdout is used')
    @Args(_arg => true)
    @Complete(arg => Compgen('file', arg))
    outputFile = '-'

    @ShortOpt('-i')
    @Brief('Modify the input file directly')
    inplace = false

    /** 输出格式选项，默认为yaml */
    @ShortOpt('-f')
    @Brief('Specify the output format, json or yaml, default to the same as input')
    @Args(['json', 'yaml'])
    format: 'json' | 'yaml'

    /** 提供命令行补全推荐，为第一个参数推荐文件 */
    complete = completeFile

    async entry(...args: string[]) {
        const source = args.shift()
        if (this.inplace) {
            if (source === '-') {
                console.error('cannot modify stdin')
                return 1
            }

            if (this.outputFile !== '-') {
                console.error('cannot specify output file when modify input file directly')
                return 1
            }

            this.outputFile = source
        }

        const input = await inputFrom(source)
        if (!input) return 1

        if (this.format && !['json', 'yaml'].includes(this.format))
            return console.error('invalid format: %s', this.format), 1

        const key = args.shift().trim()
        if (!key) return (console.error('missing key'), 1)

        const feedback = { format: this.format }
        const origin = vload(input, feedback)
        if (!origin || !key) return 1
        if(this.format) feedback.format = this.format

        const result = vdel(origin, key)
        if (!result) return 1

        const output = vfmt(result, feedback.format)
        await outputTo(output, this.outputFile)

        return 0
    }
}
export const vdelFeature = new VdelFeature()

class VmergeFeature extends Feature {
    args = '<file|-> [file...]'
    brief = 'merge the files'
    description = 'Merge the files and print the result to stdout.\n\n'

    /** 输出路径选项，默认为 '-' 表示输出到标准输出流 */
    @ShortOpt('-o')
    @Brief('Specify the output file, if omitted or "-", stdout is used')
    @Args(_arg => true)
    @Complete(arg => Compgen('file', arg))
    outputFile = '-'

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

export const vmergeFeature = new VmergeFeature()

export const notionFeatures = {
    vget: vgetFeature,
    vfmt: vfmtFeature,
    vkeys: vkeysFeature,
    vhas: vhasFeature,
    vset: vsetFeature,
    vdel: vdelFeature,
    vmerge: vmergeFeature,
}