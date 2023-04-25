import * as Publish from './publish'
import * as Revoke from './revoke'
import * as Search from './search'

export default { ...Publish, ...Revoke, ...Search }