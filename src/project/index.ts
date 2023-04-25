import { projectBuildFeature } from './build'
import { projectDraftFeature } from './draft'
import { projectInitFeature } from './init'
import { projectSetupFeature } from './setup'

export const project = {
    init: projectInitFeature,
    draft: projectDraftFeature,
    setup: projectSetupFeature,
    build: projectBuildFeature,
}