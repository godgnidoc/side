import { Args, Brief, Feature, LongOpt, ShortOpt } from "@godgnidoc/decli"
import { ComplexExport, Exports, FileDB, SimpleExport } from "format"
import { join } from "path"
import { PROJECT, Project } from "project"

class sideEnvSetFeature extends Feature {
    args = '<key> <value...>'
    brief = 'Set exports'
    description = 'Set exports\n'
        + '  key: key of exports\n'
        + '  value: value of exports'

    @Brief('Make it array')
    @LongOpt('--array') @ShortOpt('-a')
    array = <boolean>undefined

    @Brief('Override when exporting')
    @LongOpt('--override') @ShortOpt('-o')
    @Args(['true', 'false', 'default'])
    override = <'true' | 'false' | 'default'>undefined

    @Brief('Delimiter of exports or "default"')
    @LongOpt('--delimiter') @ShortOpt('-d')
    @Args(arg => arg.length === 1)
    delimiter = <string>undefined

    @Brief('Position of value in exports')
    @LongOpt('--position') @ShortOpt('-p')
    @Args(['front', 'back', 'default'])
    position = <'front' | 'back' | 'default'>undefined

    @Brief('Clear existing exports of key')
    @LongOpt('--clear') @ShortOpt('-c')
    clear = false

    async entry(key: string, ...value: string[]) {
        if (!key) {
            console.error('Key and value required')
            return 1
        }

        const project = Project.This()
        if (!project) {
            console.warn('Exporting out of project effects nothing')
            return 0
        }
        const packageId = process.env['SIDE_DIST_ID'] ?? '[user]'
        const v = (value.length <= 1 && !this.array) ? (value[0] ?? key) : value
        console.verbose('export: %s set value %s to key %s (override=%s;delimiter=%s;position=%s;clean=%s;)'
            , packageId
            , v
            , key
            , this.override
            , this.delimiter
            , this.position
            , this.clear
        )

        const db = FileDB.OpenOrCreate<Exports>(join(project.path, PROJECT.RPATH.EXPORTS), {}, {
            format: 'json',
            schema: 'Exports'
        })

        // 清理已有的导出
        if (this.clear) delete db[key]
        // 导出
        if (!(key in db)) {
            if (this.override === undefined && this.delimiter === undefined && this.position === undefined) {
                db[key] = v
            } else {
                const override = this.override === 'true'
                    ? true
                    : this.override === 'false'
                        ? false
                        : undefined
                const delimiter = this.delimiter === 'default' ? undefined : this.delimiter
                const position = this.position === 'default' ? undefined : this.position
                db[key] = {
                    override,
                    delimiter,
                    position,
                    value: v
                }
            }
            return 0
        }

        // 复杂导出
        if (this.override != undefined || this.delimiter != undefined || this.position != undefined
            || (typeof db[key] === 'object' && !(db[key] instanceof Array))) {
            const target = db[key]
            if (typeof target != 'object' || target instanceof Array) {
                db[key] = { value: target }
            }
            const comp = db[key] as ComplexExport
            if (this.override != undefined) comp.override = this.override === 'default' ? undefined : this.override === 'true'
            if (this.delimiter != undefined) comp.delimiter = this.delimiter === 'default' ? undefined : this.delimiter
            if (this.position != undefined) comp.position = this.position === 'default' ? undefined : this.position

            if (!(v instanceof Array)) {
                comp.value = v
                return 0
            }

            if (!(comp.value instanceof Array)) {
                comp.value = [comp.value.toString()]
            }

            for (const item of v) {
                if (comp.value.includes(item)) {
                    comp.value.splice(comp.value.indexOf(item), 1)
                }
            }

            const position = comp.position ?? 'front'
            if (position === 'front') comp.value.unshift(...v)
            else comp.value.push(...v)

            return 0
        }

        // 简单导出
        let target = db[key] as SimpleExport
        if (!(v instanceof Array)) {
            db[key] = v
            return 0
        }

        if (!(target instanceof Array)) {
            db[key] = [target.toString()]
        }

        target = db[key] as string[]
        for (const item of v) {
            if (target.includes(item)) {
                target.splice(target.indexOf(item), 1)
            }
        }

        target.unshift(...v)
        return 0
    }
}

class SideEnvDeleteFeature extends Feature {
    args = '<key>'
    brief = 'Delete exports'
    description = 'Delete exports\n'
        + '  key: key of exports'

    async entry(key: string) {
        const project = Project.This()
        if (!project) {
            console.warn('Exporting out of project effects nothing')
            return 0
        }
        const packageId = process.env['SIDE_DIST_ID'] ?? '[user]'
        console.verbose('export: %s delete key %s', packageId, key)

        const db = FileDB.OpenOrCreate<Exports>(join(project.path, PROJECT.RPATH.EXPORTS), {}, {
            format: 'json',
            schema: 'Exports'
        })
        delete db[key]

        return 0
    }
}

export const sideEnvFeatures = {
    set: new sideEnvSetFeature,
    del: new SideEnvDeleteFeature
}