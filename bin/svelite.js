#!/usr/bin/env node

import express from 'express'
import path from 'path'
import { readFile } from 'fs/promises'
import { Liquid } from 'liquidjs';
import postcss from 'postcss'
import tailwindcss from 'tailwindcss'

async function buildcss() {
	return postcss([
		tailwindcss({
			content: ['./**/*.liquid']
		})
	]).process('@tailwind base;\n@tailwind components;\n@tailwind utilities;').then(res => {

		console.log(res)
		return res.css
	})
}

var engine = new Liquid({
	extname: '.liquid',
	partials: path.resolve('./components'),
	layouts: path.resolve('./layouts')
});

const app = express()

app.use(express.json())
let config = await import(path.resolve('./app.config.js')).then(res => res.default)

if (!config.config) {
	config.config = {}
}
if (typeof config.config.tailwindcss === 'undefined') {
	config.config.tailwindcss = true
}
if (!config.config.components) {
	config.config.components = './components'
}
if (!config.config.layouts) {
	config.config.layouts = './layouts'
}

async function parse(filename) {
	const file = await readFile(filename, 'utf-8')
	const serverRegex = /<script server>([\s\S]*?)<\/script>/;

	const serverScriptMatch = file.match(serverRegex);
	const template = file.replace(serverRegex, '');

	const serverScript = serverScriptMatch ? serverScriptMatch[1].trim() : null;

	const load = eval('(' + serverScript + ')')

	return {
		template,
		load
	}
}

async function renderPage(page, { params, url, query }) {
	let head;

	if (config.config?.tailwindcss) {
		head = buildcss().then(css => `<style>${css}</style>`)
	}
	let result = page.map(async x => {

		let filename = path.resolve(path.join(config.config.components, x.name + '.liquid'))

		const { template, load } = await parse(filename)

		if (!x.props) x.props = {}
		if (load) {
			const props = await load({ props: x.props, params, url, query })
			x.props = { ...x.props, ...props }
		}

		return engine.parseAndRender(template, x.props)
	})

	return { html: (await Promise.all(result)).join(''), head: await head }
}

const template = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <!--head-->
</head>
<body>
    <!--body-->
</body>
</html>`


function registerPage(page, slug) {
	console.log('registerPage', page, slug)
	if (!Array.isArray(page) && typeof page == 'object') {
		for (let key in page) {
			registerPage(page[key], slug + '/' + key)
		}
	}
	if (Array.isArray(page)) {
		app.get(slug, async (req, res) => {

			const params = req.params
			const query = req.query
			const url = req.url

			const { head, html } = await renderPage(page, { url, params, query })

			res.writeHead(200, '', { 'Content-Type': 'text/html' })
			return res.end(template.replace('<!--body-->', html).replace('<!--head-->', head))
		})
	}
}

console.log(config.pages)
for (let page in config.pages) {
	registerPage(config.pages[page], '/' + page)
}

app.use(async (req, res, next) => {
	console.log(req.url)
	const slugs = req.url.split('/').slice(1)




	if (req.method === 'POST') {
		// find route
		const route = slugs.reduce((prev, curr) => {
			if (curr === '') return prev['index']
			return prev[curr]
		}, config.routes)

		if (typeof route === 'function')
			return route(req, res)
	}


	return next()
})

app.use((req, res) => {
	res.end('404 Not found')
})

const { PORT = 3000 } = process.env
app.listen(PORT, () => console.log('listening on localhost:' + PORT))
