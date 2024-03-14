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
			layout: {
				name: 'Main'
			},
			content: [
				{name: "First"}]
		}
	]
}
