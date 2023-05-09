import Ajv, { ValidateFunction } from "ajv"
import { readFileSync } from "fs"
import { load } from "js-yaml"
import { dirname, join } from "path"

export function getValidator(schema: string) {
    if (!(schema in validators)) {
        const schema_root = join(dirname(new URL(import.meta.url).pathname), 'schema')
        const schema_path = join(schema_root, schema)
        const schema_source = readFileSync(schema_path + '.json', 'utf-8')
        const schema_object = JSON.parse(schema_source)
        validators[schema] = ajv.compile(schema_object)
    }
    return validators[schema]
}

export function getLastValidateError(schema: string) {
    return validators[schema]?.errors
}

export function validate<T>(value: any, schema: string): value is T {
    const validator = getValidator(schema)
    return validator(value)
}

export function parseYaml<T>(source: string, schema: string): T {
    const value = load(source)
    if (!validate<T>(value, schema)) throw new Error(getLastValidateError(schema).map(e => e.message).join('\n'))
    return value
}

export function parseJson<T>(source: string, schema: string): T {
    const value = JSON.parse(source)
    if (!validate<T>(value, schema)) throw new Error(getLastValidateError(schema).map(e => e.message).join('\n'))
    return value
}

export function loadYaml<T>(path: string, schema: string): T {
    const source = readFileSync(path, 'utf-8')
    return parseYaml<T>(source, schema)
}

export function loadJson<T>(path: string, schema: string): T {
    const source = readFileSync(path, 'utf-8')
    return parseJson<T>(source, schema)
}

const validators: { [schema: string]: ValidateFunction } = {}
const ajv = new Ajv({
    allowUnionTypes: true
})