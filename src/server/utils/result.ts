export function done(data?: any) {
    return {
        status: 0,
        data
    }
}

export function fail(status: number, message: string) {
    return {
        status,
        message
    }
}

// 500 internal failure
export function internalFailure(message?: string) {
    return {
        status: 500, message: message || 'Internal Server Error'
    }
}

// 501 invalid argument
export function invalidArgument(message?: string) {
    return {
        status: 501, message: message || 'Invalid Argument'
    }
}

// 502 authorization failed
export function authorizationFailed(message?: string) {
    return {
        status: 502, message: message || 'Authorization Failed'
    }
}

// 503 permission denied
export function permissionDenied(message?: string) {
    return {
        status: 503, message: message || 'Permission Denied'
    }
}