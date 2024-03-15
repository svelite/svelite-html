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
							name: 'Loop',
							props: {
								items: ['Hadi', 'abdullah']
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
