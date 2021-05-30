import { config } from 'acey'
import LocalStorage from 'acey-node-store'
config.setStoreEngine(new LocalStorage('./db'))

config.done()

// require('./utils')
require('./wallet')
