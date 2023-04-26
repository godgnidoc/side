import { Axios } from "axios"
import { getFinalSettings } from "../../environment"

export interface Response<T = undefined> {
    status: number // 0 表示成功
    message: string // 当 status 不为 0 时，表示错误信息
    data?: T
}

const API = new class {
    get axios() {
        return new Axios({
            baseURL: getFinalSettings().dist.apiBaseUrl
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
        console.debug('api: post %s => %o', url, result.data)
        return JSON.parse(result.data) as Response<T>
    }
    async apost<T>(url: string, data: any, headers?: any) {
        const settings = getFinalSettings()
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
}