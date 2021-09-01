module.exports.initPresets = function (instance) {
	let presets = [
		{
			category: 'Route',
			label: 'Input to output',
			bank: {
				style: 'text',
				text: 'Route',
				size: '18',
				color: '16777215',
				bgcolor: this.rgb(0, 0, 0),
			},
			actions: [
				{
					action: 'route',
					options: {
						input: '1',
						output: '1',
						type: '!',
					},
				},
			],
		},
		{
			category: 'Route',
			label: 'Input to all outputs',
			bank: {
				style: 'text',
				text: 'Route all',
				size: '18',
				color: '16777215',
				bgcolor: this.rgb(0, 0, 0),
			},
			actions: [
				{
					action: 'inputToAll',
					options: {
						input: '1',
						type: '!',
					},
				},
			],
		},
		{
			category: 'Presets',
			label: 'Recall global preset',
			bank: {
				style: 'text',
				text: 'Recal preset',
				size: '18',
				color: '16777215',
				bgcolor: this.rgb(0, 0, 0),
			},
			actions: [
				{
					action: 'recall',
					options: {
						preset: '1',
					},
				},
			],
		},
	]

	return presets
}
