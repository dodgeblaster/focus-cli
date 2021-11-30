const { Command, flags } = require('@oclif/command')
const focus = require('../focus/index')

class TestCommand extends Command {
    async run() {
        const { flags } = this.parse(TestCommand)
        const name = flags.name || 'world'
        focus.test()
    }
}

TestCommand.description = `Describe the command here
...
Extra documentation goes here
`

TestCommand.flags = {
    name: flags.string({ char: 'n', description: 'name to print' })
}

module.exports = TestCommand
