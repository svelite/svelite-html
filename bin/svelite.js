#!/usr/bin/env node

import express from 'express'
import cookieParser from 'cookie-parser'
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
	]).process(`@tailwind base;
@tailwind components;
@tailwind utilities;`).then(res => {
		return res.css
	})
}

var engine = new Liquid({
	extname: '.liquid',
	partials: path.resolve('./components'),
	// layouts: path.resolve('./layouts'),
});

const app = express()
app.use(cookieParser())
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

if(!config.ctx) {
	config.ctx = {}
}

app.use((req, res, next) => {
	for(let key in config.ctx) {
		req[key] = config.ctx[key]
	}
	return next
})

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

async function renderPage(page, { params, url, query, cookies }) {
	let head = Promise.resolve(() => '');

	if (config.config?.tailwindcss) {
		head = buildcss().then(css => `<style>${css}</style>`)
	}

	function api(path) {
		const baseUrl = 'http://localhost:3000';

		return {
			async post(data, headers = {}) {
				return fetch(baseUrl + path, {
					method: 'POST', headers: {
						'Content-Type': 'application/json',
						...headers
					}, body: JSON.stringify(data)
				}).then(res => res.json())
			}
		}
	}

	async function renderPageContent(content) {
		let result = content.map(async x => {
			console.log({ x })

			let filename = path.resolve(path.join(config.config.components, x.name + '.liquid'))

			const { template, load } = await parse(filename)

			if (!x.props) x.props = {}
			if (load) {
				const loadParams = {
					props: x.props, params, url, query, api, cookies
				}

				const props = await load(loadParams)
				x.props = { ...x.props, ...props }
			}

			return engine.parseAndRender(template, x.props)
		})

		return (await Promise.all(result)).join('')
	}

	if (page.layout) {
		console.log('loading layout: ', page.layout)
		const { template, load } = await parse(path.resolve(path.join(config.config.layouts, page.layout.name + '.liquid')))
		if (!page.layout.props) page.layout.props = {}

		if (load) {
			const loadParams = {
				props: page.layout.props, params, url, query, api, cookies
			}

			const props = await load(loadParams)
			page.layout.props = { ...page.layout.props, ...props }
		}

		page.layout.props.content = await renderPageContent(page.content)
		const res = await engine.parseAndRender(template, page.layout.props)

		return { html: res, head: await head }
	}

	return { html: await renderPageContent(page.content), head: await head }

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

const script = `
window.svelite = {
	api(path) {
		return {
			async post(data, headers = {}) {

				return fetch(window.location.href + path.slice(1), {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						...headers
					},
					body: JSON.stringify(data)
				}).then(res => res.json())
			}
		}
	}
}
`

function registerPage(page) {
	app.get(page.slug, async (req, res) => {

		const params = req.params
		const query = req.query
		const url = req.url
		const cookies = req.cookies

		const { head, html } = await renderPage(page, { url, params, query, cookies })

		res.writeHead(200, '', { 'Content-Type': 'text/html' })
		return res.end(template.replace('<!--body-->', html + `<script>${script}</script>`).replace('<!--head-->', head))
	})
}

console.log(config.pages)
for (let page of config.pages) {
	registerPage(page)
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
