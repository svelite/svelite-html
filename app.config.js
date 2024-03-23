import path from 'path'
export default {
	config: {
		views: path.resolve('./edge')
	},
	pages: [
		{
			slug: '/test',
			content: [
				{name: 'test', content: [
					{name: 'test2'}
				]}
			]
		}
	],
	routes: {
		api: (req, res) => res.json({ hello: false }),
		test: {
			hi: (req, res) => res.json({ test: 'hi2' })
		}
	}
}
