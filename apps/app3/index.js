import {createApp} from '../../index.js'
import config from './app.config.js'

createApp(config).listen(4000, () => console.log('listening on localhost:4000'))
