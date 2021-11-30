const { Command, flags } = require('@oclif/command')
const focus = require('../focus/index')

class DeployCommand extends Command {
    async run() {
        const { flags } = this.parse(DeployCommand)
        const name = flags.name || 'world'
        focus.deploy()
    }
}

DeployCommand.description = `Describe the command here
...
Extra documentation goes here
`

DeployCommand.flags = {
    name: flags.string({ char: 'n', description: 'name to print' })
}

module.exports = DeployCommand
