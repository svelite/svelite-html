const fields = [
    { name: 'Username', key: 'username' },
    { name: 'Full Name', key: 'fullName' },
    { name: 'Email', key: 'email' },
    { name: 'Age', key: 'age' },
    { name: 'Country', key: 'country' },
    { name: 'Role', key: 'role' },
    { name: 'Status', key: 'status' },
    { name: 'Last Login', key: 'lastLogin' },
    // Add more fields as needed
];

const rows = [
    { 
        username: 'user1',
        fullName: 'John Doe',
        email: 'john.doe@example.com',
        age: 30,
        country: 'USA',
        role: 'Admin',
        status: 'Active',
        lastLogin: '2024-03-17T08:00:00',
        // Add more fields as needed
    },
    { 
        username: 'user2',
        fullName: 'Jane Smith',
        email: 'jane.smith@example.com',
        age: 25,
        country: 'Canada',
        role: 'User',
        status: 'Active',
        lastLogin: '2024-03-16T10:30:00',
        // Add more fields as needed
    },
    // Add more rows as needed
    // Assuming more than 20 rows
];

// Generate more rows to make the total number of rows more than 20
for (let i = 3; i <= 25; i++) {
    rows.push({ 
        username: `user${i}`,
        fullName: `User ${i}`,
        email: `user${i}@example.com`,
        age: Math.floor(Math.random() * 50) + 18,
        country: 'Unknown',
        role: 'User',
        status: Math.random() < 0.5 ? 'Active' : 'Inactive',
        lastLogin: new Date(Date.now() - Math.floor(Math.random() * 10000000000)).toISOString(),
        // Add more fields as needed
    });
}

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
				{name: 'Table', props: {fields, rows}}
			]
			// content: [
			// 	{
			// 		name: 'Main',
			// 		content: [
			// 			{
			// 				name: 'Loop',
			// 				props: {
			// 					items: ['Hadi', 'abdullah']
			// 				}
			// 			},
			// 			{
			// 				name: 'Condition',
			// 				props: {
			// 					true: true,
			// 					false: false
			// 				}
			// 			}
			// 		]
			// 	}
			// ]
		}
	]
}
