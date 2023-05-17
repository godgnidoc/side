import { ComplexExport, Exports, SimpleExport } from 'format'

// export type Inflatable = ProjectManifest | ProjectFinalTarget | ProjectBuildInfo
type Environment = { [key: string]: string | boolean | number }

/** 导出一个干净的环境变量备份 */
const envBackup = { ...process.env }
export function getEnvBackup() {
    return { ...envBackup }
}

function getDirectDependencies(value: SimpleExport | ComplexExport): string[] {
    if (typeof value === 'string') {
        const match = value.match(/\${(\w+)}/g)
        return match ? match.map(v => v.slice(2, -1)) : []
    } else if (typeof value === 'object' && !Array.isArray(value)) {
        return getDirectDependencies(value.value)
    } else if (Array.isArray(value)) {
        return value.flatMap(getDirectDependencies)
    } else {
        return []
    }
}

function topologicalSort(exports: Exports) {
    const results: string[] = []
    const resultsSet: Set<string> = new Set()
    const pending: string[] = Object.keys(exports)
    const pendingSet: Set<string> = new Set(pending)

    const Collect = (key: string) => {
        const dependencies = getDirectDependencies(exports[key])
        for (const dependency of dependencies) {
            if (resultsSet.has(dependency)) continue
            if (pendingSet.has(dependency)) {
                pendingSet.delete(dependency)
                Collect(dependency)
            }
        }
        if (!resultsSet.has(key)) {
            resultsSet.add(key)
            results.push(key)
        }
    }

    while (pending.length) {
        const node = pending.shift()
        pendingSet.delete(node)
        Collect(node)
    }

    return results
}

export function evaluate(value: string | number | boolean, env: Environment) {
    if (typeof value === 'number' || typeof value === 'boolean') return value.toString()

    if (!value.includes('$')) return value
    return value.replace(/(?<![\\\$])\${(\w+)}/g, (_, key) => {
        return env[key]?.toString() || ''
    }).replace(/\\\$|\$\$/g, '$')
}

export function inflate(exports: Exports, env: Environment = getEnvBackup()): NodeJS.ProcessEnv {
    const keys = topologicalSort(exports)
    for (const key of keys) {
        const target = exports[key]

        if (target === undefined || target === null) {
            delete env[key]
            continue
        }

        const complexTarget = Array.isArray(target)
            ? { value: target }
            : typeof target === 'object'
                ? target
                : { value: target }
        const value = Array.isArray(complexTarget.value)
            ? complexTarget.value.filter(v => v !== undefined && v !== null).map(v => evaluate(v, env))
            : evaluate(complexTarget.value, env)
        const delimiter = complexTarget['delimiter'] ?? ':'
        const override = Array.isArray(complexTarget.value)
            ? complexTarget['override'] ?? false
            : true
        const position = complexTarget['position'] ?? 'front'

        if (override || !(key in env)) {
            env[key] = Array.isArray(value) ? value.join(delimiter) : value
            continue
        }

        const has = env[key].toString().split(delimiter)
        const valueArray = Array.isArray(value) ? value : [value]
        const filteredValues = valueArray.filter(item => !has.includes(item))

        env[key] = position == 'front' ? [...filteredValues, ...has].join(delimiter) : [...has, ...filteredValues].join(delimiter)
    }
    return env as NodeJS.ProcessEnv
}