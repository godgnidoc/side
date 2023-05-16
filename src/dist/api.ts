import { Axios, AxiosRequestConfig } from 'axios'
import { PackageManifest } from 'format'
import { createReadStream } from 'fs'
import { SidePlatform } from 'platform'

export interface Response<T = undefined> {
    status: number // 0 表示成功
    message: string // 当 status 不为 0 时，表示错误信息
    data?: T
}

const API = new class {
    get axios() {
        return new Axios({
            baseURL: SidePlatform.settings.dist.apiBaseUrl
        })
    }

    async post<T>(url: string, data: any, headers?: any) {
        const axios = this.axios
        const json = JSON.stringify(data)
        console.debug('api: post %s %s', url, json)
        const result = await axios.post(url, json, {
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        })
        console.debug('api: authed post %s => %o', url, result.data)
        return JSON.parse(result.data) as Response<T>
    }
    async apost<T>(url: string, data: any, headers?: any) {
        const settings = SidePlatform.settings
        const name = settings?.dist?.user
        const token = settings?.dist?.token
        if (!token || !name) {
            throw new Error('Please login first')
        }
        return await this.post<T>(url, data, {
            ...headers,
            'Login-Token': Buffer.from(`${name}:${token}`).toString('base64')
        })
    }

    async get<T>(url: string, params: any) {
        const axios = this.axios
        console.debug('api: get %s: %o', url, params)
        const result = await axios.get(url, { params })
        console.debug('api: get %s => %o', url, result.data)
        return JSON.parse(result.data) as Response<T>
    }

    async task(token: string, payload: any, options?: AxiosRequestConfig<any>) {
        const axios = this.axios
        return await axios.post('/tasks', payload, {
            headers: {
                'Task-Token': token,
            }, ...options
        })
    }
}

export const api = new class {
    readonly user = new class {
        async login(name: string, password: string) {
            return await API.post<string>('/user/login', { name, password })
        }

        async exist(name: string) {
            return await API.get('/user/exist', { name })
        }

        async create(name: string, email: string, password: string) {
            return await API.apost('/user/create', { name, email, password })
        }
    }
    readonly scope = new class {
        async create(name: string) {
            return await API.apost('/scope/create', { name })
        }
        async search(pattern: string) {
            return await API.get<string[]>('/scope/search', { pattern })
        }
    }
    readonly repo = new class {
        async create(id: string) {
            return await API.apost('/repo/create/by_id', { id })
        }
        async search(pattern: string) {
            return await API.get<string[]>('/repo/search', { pattern })
        }
    }

    readonly package = new class {
        async publish(manifest: PackageManifest, path: string, allowOverwrite: boolean, allowDowngrade: boolean) {
            const res = await API.apost<string>('/package/publish', {
                manifest: manifest.toJson(), allowOverwrite, allowDowngrade
            })
            if (res.status != 0) return res
            const token = res.data
            const result = await API.task(token, createReadStream(path))
            console.debug('api: publish %s => %o', token, result.data)
            return JSON.parse(result.data) as Response
        }
        async search(pattern: string) {
            return await API.get<string[]>('/package/search/by_pattern', { pattern })
        }
        async query(query: string, version?: string) {
            return await API.get<string[]>('/package/search/by_query', { query, version })
        }
        async stat(id: string) {
            return await API.get<{
                id: string,
                size: number,
                mtime: number
            }>('/package/stat', { id })
        }
        async download(id: string) {
            const res = await API.get<{
                id: string,
                size: number,
                mtime: number,
                token: string,
                stream: NodeJS.ReadableStream
            }>('/package/download', { id })
            if (res.status != 0) return res
            const token = res.data.token
            const result = await API.task(token, undefined, {
                responseType: 'stream',
                maxContentLength: Infinity,
            })
            res.data.stream = result.data
            return res
        }
    }
}