#!/usr/bin/env node
import path from 'path'
import { runApp } from "../index.js"

const config = await import(path.resolve('./app.config.js')).then(res => res.default)

runApp(config, 3000)

