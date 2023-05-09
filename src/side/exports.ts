import { Args, Brief, Feature, LongOpt, ShortOpt } from "@godgnidoc/decli"
import { StructuralExports } from "format"
import { readFile } from "fs/promises"
import { join } from "path"
import { PROJECT, Project } from "project"

class sideExportsSetFeature extends Feature {
    args = '<key> <value...>'
    brief = 'Set exports'
    description = 'Set exports\n'
        + '  key: key of exports\n'
        + '  value: value of exports'

    @Brief('Make it array')
    @LongOpt('--array') @ShortOpt('-a')
    array = <boolean>undefined

    @Brief('Clean existing exports config')
    @LongOpt('--clean') @ShortOpt('-c')
    clean = false

    @Brief('Override when exporting')
    @LongOpt('--override') @ShortOpt('-o')
    override = <boolean>undefined

    @Brief('Delimiter of exports')
    @LongOpt('--delimiter') @ShortOpt('-d')
    @Args(arg => arg.length === 1)
    delimiter = ':'

    async entry(key: string, ...value: string[]) {
        this.array = this.array || value.length > 1
        if (!key || !value.length) {
            console.error('Key and value required')
            return 1
        }

        if (!Project.This()) {
            console.warn('Exporting out of project effects nothing')
            return 0
        }

        const path = join(Project.This().path, PROJECT.RPATH.SYSROOT, 'exports')
        let exports_: StructuralExports = {}
        try {
            exports_ = JSON.parse(await readFile(path, 'utf-8'))
        } catch (e) {
            console.verbose('No exports file found')
        }

        if (this.clean) delete exports_[key]

        // if (key in exports_) {
        //     const ex = exports_[key]
        //     ex.value = this.array 
        //         ? ex.value.concat(value) : value[0]
        // }


        return 0
    }
}

export const sideExportsFeatures = {
    set: new sideExportsSetFeature
}