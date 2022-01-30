import { Command, Flags } from '@oclif/core'
import { deploy } from '../../focus/deploy'

export default class Deploy extends Command {
    static description = 'Say hello'

    static examples = [
        `$ oex hello friend --from oclif
hello friend from oclif! (./src/commands/hello/index.ts)
`
    ]

    static flags = {
        stage: Flags.string({
            char: 's',
            description: 'Stage of deployment',
            required: false
        }),
        region: Flags.string({
            char: 'r',
            description: 'AWS Region',
            required: false
        })
    }

    async run(): Promise<void> {
        const { flags } = await this.parse(Deploy)
        const stage = flags.stage || undefined
        const region = flags.region || undefined
        deploy(stage, region)
    }
}
