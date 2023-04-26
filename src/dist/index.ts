import { distLoginFeature } from './client'
import { distServeFeature } from './server'

export const dist = {
    serve: distServeFeature,
    login: distLoginFeature
}