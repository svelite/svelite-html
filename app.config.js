export default {
	pages: [
		{
			slug: '/test', 
			content: [
				{
					name: 'Test',
					content: [
						{
							name: 'TestPage', 
							content: [
								{name: 'Leaf'}
							]
						}
					]
				}
			]
		}
	],
	routes: {
		api: (req, res) => res.json({hello: false}),
		test: {
			hi: (req, res) => res.json({test: 'hi'})
		}
	}
}
