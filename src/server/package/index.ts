import { postRevoke } from './revoke'
import { Search } from './search'
import { getStat } from './stat'
import { getDownload } from './download'
import { postPublish } from './publish'

export const Package = { postPublish, postRevoke, Search, getStat, getDownload }