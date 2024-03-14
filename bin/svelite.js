#!/usr/bin/env node
import path from 'path'
import { createApp } from "../index.js"

const config = await import(path.resolve('./app.config.js')).then(res => res.default)

const app = createApp(config)

const { PORT = 3000 } = process.env
app.listen(PORT, () => console.log('listening on http://localhost:' + PORT))
