const { Command, flags } = require('@oclif/command')
const focus = require('../focus/index')

class DeployCommand extends Command {
    async run() {
        const { flags } = this.parse(DeployCommand)
        const stage = flags.stage || undefined
        const region = flags.region || undefined
        focus.deploy(stage, region)
    }
}

DeployCommand.description = `Describe the command here
...
Extra documentation goes here
`

DeployCommand.flags = {
    stage: flags.string({ char: 's', description: 'name to print' }),
    region: flags.string({ char: 'r', description: 'name to print' })
}

module.exports = DeployCommand
