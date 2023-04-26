import { Axios } from "axios"
import { getFinalSettings } from "../../environment"

function getBaseUrl() {
    return getFinalSettings().dist.apiBaseUrl
}

export interface Response<T> {
    status: number // 0 表示成功
    message: string // 当 status 不为 0 时，表示错误信息
    data?: T
}

const API = new class {
    get axios() {
        return new Axios({
            baseURL: getBaseUrl(),
            headers: {
                'Content-Type': 'application/json'
            }
        })
    }

    async post<T>(url: string, data: any, headers?: any) {
        const axios = this.axios
        const json = JSON.stringify(data)
        console.debug('api: post %s %s', url, json)
        const result = await axios.post(url, json, { headers })
        console.debug('api: post %s %s => %o', url, json, result.data)
        return JSON.parse(result.data) as Response<T>
    }
}

export const api = new class {
    readonly user = new class {
        async login(name: string, password: string) {
            return await API.post<string>('/user/login', { name, password })
        }
    }
}