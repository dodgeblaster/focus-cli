const { Command, flags } = require('@oclif/command')
const focus = require('../focus/index')

class DeployLayersCommand extends Command {
    async run() {
        const { flags } = this.parse(DeployLayersCommand)
        const name = flags.name || 'world'
        focus.deployLayers()
    }
}

DeployLayersCommand.description = `Describe the command here
...
Extra documentation goes here
`

DeployLayersCommand.flags = {
    name: flags.string({ char: 'n', description: 'name to print' })
}

module.exports = DeployLayersCommand
