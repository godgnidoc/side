import { watch } from 'chokidar'
import { loadJsonSync, loadYamlSync } from './validate'
import { accessSync, mkdirSync, statSync, writeFileSync } from 'fs'
import { dump } from 'js-yaml'
import { dirname } from 'path'

/**
 * 文件数据库类
 * 实现内存数据与文件数据的同步
 * 利用 Proxy 实现递归代理，文件修改后自动更新内存数据，内存数据修改后自动更新文件
 */
export class FileDB {
    get proxy() {
        if (this.cache instanceof Array)
            return new Proxy(this.cache, new ArrayProxyHandler(this))
        else
            return new Proxy(this.cache, new ObjectProxyHandler(this))
    }

    /** 加载文件内容到缓冲 */
    load(): void {
        console.verbose('FileDB: reading %s', this.path)
        const stat = statSync(this.path)
        if (stat.mtimeMs <= this.timestamp) return
        if (this.format == 'json') this.cache = loadJsonSync(this.path, this.schema)
        else if (this.format == 'yaml') this.cache = loadYamlSync(this.path, this.schema)
    }

    /** 保存缓冲内容到文件 */
    save(): void {
        console.verbose('FileDB: writing %s', this.path)
        this.timestamp = Date.now()
        if (this.format == 'json') writeFileSync(this.path, JSON.stringify(this.cache, null, this.indent))
        else if (this.format == 'yaml') writeFileSync(this.path, dump(this.cache))
    }

    /** 获取键路径指定的属性 */
    get<T>(keys: (string | symbol)[], ph = false): T {
        let obj = ph ? this.placeholder : this.cache
        for (const key of keys) {
            if (obj === undefined) break
            obj = obj[key]
        }

        if (obj === undefined) {
            if (!ph) {
                return this.get(keys, true)
            }
        }
        return obj
    }

    set<T>(keys: (string | symbol)[], value: T): void {
        const key = keys.pop()
        let obj = this.cache
        for (const key of keys) {
            if (obj[key] === undefined) obj[key] = {}
            obj = obj[key]
        }
        obj[key] = value
        this.save()
    }

    /**
     * 构造函数
     * @param path 文件路径
     * @param format 文件格式
     * @param schema 文件结构
     */
    private constructor(
        readonly path: string,
        readonly format: 'json' | 'yaml',
        readonly schema: string,
        private placeholder: any,
        private indent: number) {
        this.load()
        watch(path).on('change', this.load.bind(this))
    }

    static Update(path: string): void {
        if (path in dbpool) dbpool[path].load()
    }

    static Open<T>(path: string, config: FileDB.OpenConfig<T>): T {
        if (!(path in dbpool))
            dbpool[path] = new FileDB(path, config.format, config.schema, config.placeholder, config.indent)
        return dbpool[path].proxy as T
    }

    static Create<T>(path: string, init: T, config: FileDB.OpenConfig<T>): T {
        mkdirSync(dirname(path), { recursive: true })
        if (config.format == 'json') writeFileSync(path, JSON.stringify(init))
        else if (config.format == 'yaml') writeFileSync(path, dump(init))

        return this.Open(path, config)
    }

    static Dump<T>(proxy: T): T {
        return JSON.parse(JSON.stringify(proxy))
    }

    static OpenOrCreate<T>(path: string, init: T, config: FileDB.OpenConfig<T>): T {
        try {
            accessSync(path)
            return this.Open(path, config)
        } catch (e) {
            return this.Create(path, init, config)
        }
    }

    private cache: any
    private timestamp = 0
}

export namespace FileDB {
    export interface OpenConfig<T> {
        format: 'json' | 'yaml'
        schema: string
        placeholder?: Partial<T>
        indent?: number
    }
}

class ObjectProxyHandler<T extends object> implements ProxyHandler<T> {
    constructor(private db: FileDB, private keys: (string | symbol)[] = []) { }

    get(_target: T, key: string | symbol, _receiver: any): any {
        const newKeys = [...this.keys, key]
        const res = this.db.get(newKeys)
        if (res instanceof Array)
            return new Proxy(res, new ArrayProxyHandler(this.db, newKeys))
        else if (res instanceof Object)
            return new Proxy(res, new ObjectProxyHandler(this.db, newKeys))
        else
            return res
    }

    set(_target: T, key: string | symbol, value: any, _receiver: any): boolean {
        this.db.set([...this.keys, key], value)
        this.db.save()
        return true
    }

    deleteProperty(_target: T, key: string | symbol): boolean {
        const obj = this.db.get(this.keys)
        delete obj[key]
        this.db.save()
        return true
    }

    ownKeys(_target: T): (string | symbol)[] {
        const obj = this.db.get(this.keys)
        return Object.keys(obj)
    }

    has(_target: T, key: string | symbol): boolean {
        const obj = this.db.get(this.keys) as object
        return key in obj
    }

    getOwnPropertyDescriptor(_target: T, key: string | symbol): PropertyDescriptor | undefined {
        const obj = this.db.get(this.keys) as object
        return Object.getOwnPropertyDescriptor(obj, key)
    }

    defineProperty(_target: T, key: string | symbol, attributes: PropertyDescriptor): boolean {
        const obj = this.db.get(this.keys) as object
        Object.defineProperty(obj, key, attributes)
        this.db.save()
        return true
    }

    getPrototypeOf(_target: T): object | null {
        const obj = this.db.get(this.keys) as object
        return Object.getPrototypeOf(obj)
    }
}

class ArrayProxyHandler<T extends object> implements ProxyHandler<T> {
    constructor(private db: FileDB, private keys: (string | symbol)[] = []) { }

    get(_target: T, key: string | symbol, _receiver: any): any {
        if (key === 'pop' || key === 'push' || key === 'shift' || key === 'unshift' || key === 'splice' || key === 'sort' || key === 'reverse') {
            const obj = this.db.get(this.keys)
            return (...args: any[]) => {
                const res = obj[key](...args)
                this.db.save()
                return res
            }
        }
        const newKeys = [...this.keys, key]
        const res = this.db.get(newKeys)
        if (res instanceof Array)
            return new Proxy(res, new ArrayProxyHandler(this.db, newKeys))
        else if (res instanceof Object)
            return new Proxy(res, new ObjectProxyHandler(this.db, newKeys))
        else
            return res
    }

    set(_target: T, key: string | symbol, value: any, _receiver: any): boolean {
        this.db.set([...this.keys, key], value)
        this.db.save()
        return true
    }

    deleteProperty(_target: T, key: string | symbol): boolean {
        const obj = this.db.get(this.keys)
        delete obj[key]
        this.db.save()
        return true
    }

    ownKeys(_target: T): (string | symbol)[] {
        const obj = this.db.get(this.keys)
        return Object.keys(obj)
    }

    has(_target: T, key: string | symbol): boolean {
        const obj = this.db.get(this.keys) as object
        return key in obj
    }

    getOwnPropertyDescriptor(_target: T, key: string | symbol): PropertyDescriptor | undefined {
        const obj = this.db.get(this.keys) as object
        return Object.getOwnPropertyDescriptor(obj, key)
    }

    defineProperty(_target: T, key: string | symbol, attributes: PropertyDescriptor): boolean {
        const obj = this.db.get(this.keys) as object
        Object.defineProperty(obj, key, attributes)
        this.db.save()
        return true
    }

    getPrototypeOf(_target: T): object | null {
        const obj = this.db.get(this.keys) as object
        return Object.getPrototypeOf(obj)
    }
}

/** 数据库对象池 */
const dbpool: { [path: string]: FileDB } = {}