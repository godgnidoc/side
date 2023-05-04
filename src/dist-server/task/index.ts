import { randomUUID } from "crypto"
import { RequestContext, RequestHandler } from "jetweb"


interface Task {
    /** 超时剩余秒数 */
    timeoutSeconds: number

    /** 请求处理回调 */
    requestHandler?: RequestHandler

    /** 超时处理回调 */
    timeoutHandler?: Function

    /** 请求处理函数的参数 */
    args?: any[]
}

const TaskTable: { [token: string]: Task } = {}

/**
 * 创建一个任务
 * @param requestHandler 请求处理回调
 * @param args 调用函数时的参数
 * @param timeoutHandler 超时处理回调
 * @param timeoutSeconds 超时秒数
 * @returns 任务标识
 */
export function CreateTask(requestHandler: RequestHandler, args: any[] | undefined, timeoutHandler: Function, timeoutSeconds: number = 60): string {
    const token = randomUUID()
    TaskTable[token] = {
        timeoutSeconds,
        requestHandler,
        timeoutHandler,
        args
    }
    console.debug('Create task %s', token)
    return token
}

/**
 * 响应任务请求，任务标识从请求头中获取，若任务不存在则返回404
 * @param this 请求上下文
 */
export function postTasks(this: RequestContext) {
    const token = this.request.incomingMessage.headers['task-token']
    if (typeof token == 'string') {
        const task = TaskTable[token]
        if (task) {
            delete TaskTable[token]
            return task.requestHandler?.call(this, ...task.args)
        }
    }

    this.response.statusCode = 404
    console.error('Task %s not found', token)
}

/**
 * 每隔1秒清理一次过期的任务，若任务设置了超时处理函数，则调用该函数
 */
setInterval(() => {
    const timeouts: string[] = []
    const handlers: Function[] = []

    for (const token in TaskTable) {
        const task = TaskTable[token]
        if (task.timeoutSeconds-- <= 0) {
            task.requestHandler = undefined
            timeouts.push(token)
            if (task.timeoutHandler) {
                handlers.push(task.timeoutHandler)
            }
        }
    }

    for (const token of timeouts) {
        delete TaskTable[token]
        console.debug('Task %s timeout', token)
    }

    for (const handler of handlers) {
        handler()
    }
}, 1000)