#!/usr/bin/env node
import path from 'path'
import { createApp } from "../index.js"

const config = await import(path.resolve('./app.config.js')).then(res => res.default)

createApp(config).start(3000)
