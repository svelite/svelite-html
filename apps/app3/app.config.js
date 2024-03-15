export default {
	middlewares: [
		(req, res, next) => {
			console.log('request')
			next()
		}
	],
	pages: [ 
		 {
			slug: '/test',
			content: [
				{
					name: 'Main',
					content: [
						{
							name: 'First',
							props: {
								name: 'Hadi'
							}
						},
						{
							name: 'Condition',
							props: {
								true: true,
								false: false
							}
						}
					]
				}
			]
		}
	]
}
