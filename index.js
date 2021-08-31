const instance_skel = require('../../instance_skel')
const TelnetSocket = require('../../telnet')
let debug = () => {}

class instance extends instance_skel {
	constructor(system, id, config) {
		super(system, id, config)
		// Request id counter
		this.request_id = 0
		this.login = false
		this.status(1, 'Initializing')
		this.actions() // export actions
	}

	updateConfig(config) {
		this.config = config
		this.init_telnet()
	}

	init() {
		debug = this.debug

		this.init_telnet()
	}

	incomingData(data) {
		debug(data)

		// Match part of the copyright response from unit when a connection is made.
		if (this.login === false && data.match(/Extron Electronics/)) {
			this.status(this.STATUS_WARNING, 'Logging in')
			this.socket.write('I\n') // Matrix information request
		}

		if (this.login === false && data.match(/Password:/)) {
			this.status(this.STATUS_WARNING, 'Logging in')
			this.socket.write('\r' + this.config.password + '\r') // Enter Password Set
		}

		// Match login sucess response from unit.
		else if (this.login === false && data.match(/Login/)) {
			this.login = true
			this.status(this.STATUS_OK)
			debug('logged in')
		}
		// Match expected response from unit.
		else if (this.login === false && data.match(/V|60-/)) {
			this.login = true
			this.status(this.STATUS_OK)
			debug('logged in')
		}
		else {
			this.log("info", "Response: " + data.toString())
		}

		// Heatbeat to keep connection alive
		function heartbeat() {
			this.login = false
			this.status(this.STATUS_WARNING, 'Checking Connection')
			this.socket.write('N\n') // should respond with Switcher part number
			debug('Checking Connection')
		}
		if (this.login === true) {
			clearInterval(this.heartbeat_interval)
			let beat_period = 60 // Seconds
			this.heartbeat_interval = setInterval(heartbeat, beat_period * 1000)
		} else {
			debug('data nologin', data)
		}
	}

	init_telnet() {
		if (this.socket !== undefined) {
			this.socket.destroy()
			delete this.socket
			this.login = false
		}

		if (this.config.host) {
			this.socket = new TelnetSocket(this.config.host, 23)

			this.socket.on('status_change', (status, message) => {
				if (status !== this.STATUS_OK) {
					this.status(status, message)
				}
			})

			this.socket.on('error', (err) => {
				debug('Network error', err)
				this.log('error', 'Network error: ' + err.message)
				this.login = false
			})

			this.socket.on('connect', () => {
				debug('Connected')
				this.login = false
			})

			// if we get any data, display it to stdout
			this.socket.on('data', (buffer) => {
				let indata = buffer.toString('utf8')
				this.incomingData(indata)
			})

			this.socket.on('iac', (type, info) => {
				// tell remote we WONT do anything we're asked to DO
				if (type == 'DO') {
					this.socket.write(Buffer.from([255, 252, info]))
				}

				// tell the remote DONT do whatever they WILL offer
				if (type == 'WILL') {
					this.socket.write(Buffer.from([255, 254, info]))
				}
			})
		}
	}

	CHOICES_TYPE = [
		{ label: 'Audio & Video', id: '!' },
		{ label: 'Video only', id: '%' },
		{ label: 'Audio only', id: '$' },
	]

	// Return config fields for web config
	config_fields() {
		return [
			{
				type: 'text',
				id: 'info',
				width: 12,
				label: 'Information',
				value: 'This will establish a telnet connection to the XTP',
			},
			{
				type: 'textinput',
				id: 'host',
				label: 'XTP IP address',
				width: 12,
				default: '192.168.254.254',
				regex: this.REGEX_IP,
			},
			{
				type: 'textinput',
				id: 'password',
				label: 'Admin or User Password',
				width: 8,
			},
		]
	}

	// When module gets deleted
	destroy() {
		clearInterval(this.heartbeat_interval) //Stop Heartbeat

		if (this.socket !== undefined) {
			this.socket.destroy()
		}

		debug('destroy', this.id)
	}

	actions(system) {
		let actions = {
			route: {
				label: 'Route input to output',
				options: [
					{
						type: 'textinput',
						label: 'input',
						id: 'input',
						regex: this.REGEX_NUMBER,
					},
					{
						type: 'textinput',
						label: 'output',
						id: 'output',
						regex: this.REGEX_NUMBER,
					},
					{
						type: 'dropdown',
						label: 'type',
						id: 'type',
						choices: this.CHOICES_TYPE,
						default: '!',
					},
				],
			},
			inputToAll: {
				label: 'Route input to all outputs',
				options: [
					{
						type: 'textinput',
						label: 'input',
						id: 'input',
						regex: this.REGEX_NUMBER,
					},
					{
						type: 'dropdown',
						label: 'type',
						id: 'type',
						choices: this.CHOICES_TYPE,
						default: '!',
					},
				],
			},
			recall: {
				label: 'Recall preset',
				options: [
					{
						type: 'textinput',
						label: 'preset',
						id: 'preset',
						regex: this.REGEX_NUMBER,
					},
				],
			},
			saveGlobalP: {
				label: 'Save preset',
				options: [
					{
						type: 'textinput',
						label: 'preset',
						id: 'preset',
						regex: this.REGEX_NUMBER,
					},
				],
			},
		}

		this.setActions(actions)
	}

	action(action) {
		let id = action.action
		let opt = action.options
		let cmd

		switch (id) {
			case 'route':
				cmd = opt.input + '*' + opt.output + opt.type
				break

			case 'inputToAll':
				cmd = opt.input + '*' + opt.type
				break

			case 'recall':
				cmd = `WR${opt.preset}PRST|`
				break
		}

		if (cmd !== undefined) {
			if (this.socket !== undefined && this.socket.connected) {
				this.socket.write(cmd + '\n')
			} else {
				debug('Socket not connected :(')
			}
		}
	}
}
exports = module.exports = instance
