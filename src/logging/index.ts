import { upgradeFormat } from "./format";
import { LogLevel, isEnabled } from "./level";

declare global {
    interface Console {
        verbose(fmt: string, ...args: any[]): void;
    }
}

console.verbose = function (fmt: string, ...args: any[]) {
    if (process.env["SIDE_VERBOSE"] === "TRUE") {
        console.log(upgradeFormat(fmt, 'verbose'), ...args)
    }
}

/** 将控制台打印函数均替换为带时间戳、严重性和颜色的打印函数 */
for (const key of ['debug', 'info', 'warn', 'error']) {

    const func = console[key];
    console[key] = function (fmt: string, ...args: any[]) {
        const sev = key as LogLevel
        if (isEnabled(sev)) {
            func(upgradeFormat(fmt, sev), ...args);
        }
    };
}

export { SetLogLevel, GetLogLevel, LogLevel } from "./level";