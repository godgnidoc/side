import Ajv, { ValidateFunction } from 'ajv'
import { readFileSync } from 'fs'
import { readFile } from 'fs/promises'
import { load } from 'js-yaml'
import { dirname, join } from 'path'

export function getValidatorSync(schema: string) {
    if (!(schema in validators)) {
        const schemaRoot = join(dirname(new URL(import.meta.url).pathname), 'schema')
        const schemaPath = join(schemaRoot, schema)
        const schemaSource = readFileSync(schemaPath + '.json', 'utf-8')
        const schemaObject = JSON.parse(schemaSource)
        validators[schema] = ajv.compile(schemaObject)
    }
    return validators[schema]
}

export async function getValidator(schema: string) {
    if (!(schema in validators)) {
        const schemaRoot = join(dirname(new URL(import.meta.url).pathname), 'schema')
        const schemaPath = join(schemaRoot, schema)
        const schemaSource = await readFile(schemaPath + '.json', 'utf-8')
        const schemaObject = JSON.parse(schemaSource)
        validators[schema] = ajv.compile(schemaObject)
    }
    return validators[schema]
}

export function getLastValidateError(schema: string) {
    return validators[schema]?.errors
}

export function getLastValidateErrorText(schema: string) {
    return getLastValidateError(schema).map(e => e.message).join('\n')
}

export function validateSync<T>(value: any, schema: string): value is T {
    const validator = getValidatorSync(schema)
    return validator(value)
}

export async function validate(value: any, schema: string) {
    const validator = await getValidator(schema)
    return validator(value)
}

export function parseYamlSync<T>(source: string, schema: string): T {
    const value = load(source)
    if (!validateSync<T>(value, schema)) throw new Error(getLastValidateErrorText(schema))
    return value
}

export async function parseYaml<T>(source: string, schema: string) {
    const value = load(source)
    if (! await validate(value, schema)) throw new Error(getLastValidateErrorText(schema))
    return value as T
}

export function parseJsonSync<T>(source: string, schema: string): T {
    const value = JSON.parse(source)
    if (!validateSync<T>(value, schema)) throw new Error(getLastValidateErrorText(schema))
    return value
}

export async function parseJson<T>(source: string, schema: string) {
    const value = JSON.parse(source)
    if (! await validate(value, schema)) throw new Error(getLastValidateErrorText(schema))
    return value as T
}

export function loadYamlSync<T>(path: string, schema: string): T {
    const source = readFileSync(path, 'utf-8')
    return parseYamlSync<T>(source, schema)
}

export async function loadYaml<T>(path: string, schema: string): Promise<T> {
    const source = await readFile(path, 'utf-8')
    return await parseYaml<T>(source, schema)
}

export function loadJsonSync<T>(path: string, schema: string): T {
    const source = readFileSync(path, 'utf-8')
    return parseJsonSync<T>(source, schema)
}

export async function loadJson<T>(path: string, schema: string): Promise<T> {
    const source = await readFile(path, 'utf-8')
    return await parseJson<T>(source, schema)
}

const validators: { [schema: string]: ValidateFunction } = {}
const ajv = new Ajv({
    allowUnionTypes: true
})