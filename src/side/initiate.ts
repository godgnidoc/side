import { join } from "path"
import { projectName, projectPath, rpaths, sideHome, inflateExports, inflate, getFinalSettings, getFinalTarget } from "../environment"

export function InitiateEnvironment() {
    /** 将基础环境变量导出至环境变量 */
    inflateBasicEnv()

    /** 将汇总设置导出至环境变量 */
    inflate(getFinalSettings(), process.env)

    /** 将汇总的目标信息导出至环境变量 */
    inflate(getFinalTarget(), process.env)
}

function inflateBasicEnv() {
    inflateExports({
        LANG: 'C.UTF-8',
        LANGUAGE: 'C.UTF-8',
        SIDE_PROJECT_NAME: projectName,
        NODE_PATH: [
            '/usr/lib/node_modules',
            join(sideHome, rpaths.sideSysroot, 'lib', 'node_modules'),
            join(sideHome, rpaths.sideSysroot, 'usr', 'lib', 'node_modules'),
            projectPath ? join(projectPath, rpaths.projectSysroot, 'lib', 'node_modules') : undefined,
            projectPath ? join(projectPath, rpaths.projectSysroot, 'usr', 'lib', 'node_modules') : undefined,
        ],
        LD_LIBRARY_PATH: [
            join(sideHome, rpaths.sideSysroot, 'lib64'),
            join(sideHome, rpaths.sideSysroot, 'lib'),
            join(sideHome, rpaths.sideSysroot, 'lib', 'x86_64-linux-gnu'),
            join(sideHome, rpaths.sideSysroot, 'usr', 'lib64'),
            join(sideHome, rpaths.sideSysroot, 'usr', 'lib'),
            join(sideHome, rpaths.sideSysroot, 'usr', 'lib', 'x86_64-linux-gnu'),
            projectPath ? join(projectPath, rpaths.projectSysroot, 'lib64') : undefined,
            projectPath ? join(projectPath, rpaths.projectSysroot, 'lib') : undefined,
            projectPath ? join(projectPath, rpaths.projectSysroot, 'lib', 'x86_64-linux-gnu') : undefined,
            projectPath ? join(projectPath, rpaths.projectSysroot, 'usr', 'lib64') : undefined,
            projectPath ? join(projectPath, rpaths.projectSysroot, 'usr', 'lib') : undefined,
            projectPath ? join(projectPath, rpaths.projectSysroot, 'usr', 'lib', 'x86_64-linux-gnu') : undefined,
        ],
        PATH: [
            join(sideHome, rpaths.sideSysroot, 'bin'),
            join(sideHome, rpaths.sideSysroot, 'sbin'),
            join(sideHome, rpaths.sideSysroot, 'usr', 'bin'),
            join(sideHome, rpaths.sideSysroot, 'usr', 'sbin'),
            projectPath ? join(projectPath, rpaths.projectSysroot, 'bin') : undefined,
            projectPath ? join(projectPath, rpaths.projectSysroot, 'sbin') : undefined,
            projectPath ? join(projectPath, rpaths.projectSysroot, 'usr', 'bin') : undefined,
            projectPath ? join(projectPath, rpaths.projectSysroot, 'usr', 'sbin') : undefined,
        ]
    }, process.env)
}