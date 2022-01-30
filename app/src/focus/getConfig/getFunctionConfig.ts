import foundation from 'rise-foundation'
import cli from 'rise-cli-foundation'
import { Permission, CodeConfig, FunctionConfig } from '../interfaces'

async function parseConfig(
    originalState: any,
    dirPath: string
): Promise<{
    state: Record<string, string>
    config: Record<string, CodeConfig>
}> {
    let state = originalState
    let configObj: Record<string, CodeConfig> = {}
    const dir = cli.fileSystem.getDirectories(dirPath)
    for (const x of dir) {
        const path = `${dirPath}/${x}/config.js`
        let config = require(path)

        /**
         * Handle alarm config
         */
        if (config.alarm && config.alarm.snsTopic) {
            const res = await foundation.keywords.getKeyword(
                state,
                config.alarm.snsTopic
            )
            state = res.state
            config.alarm.snsTopic = res.result
        }

        /**
         * Handle trigger config
         */
        if (config.trigger) {
            const res = await foundation.keywords.getKeyword(
                state,
                config.trigger
            )
            state = res.state
            config.trigger = res.result
        }

        /**
         * Handle env config
         */
        if (config.env) {
            for (const k of Object.keys(config.env)) {
                const res = await foundation.keywords.getKeyword(
                    state,
                    config.env[k]
                )

                state = res.state
                config.env[k] = res.result
            }
        }

        /**
         * Handle permission config
         */
        if (config.permissions) {
            let permissions: Permission[] = []
            for (const k of config.permissions) {
                const res = await foundation.keywords.getKeyword(
                    state,
                    k.Resource
                )
                state = res.state
                permissions.push({
                    Effect: k.Effect,
                    Action: k.Action,
                    Resource: res.result
                })
            }
            config.permissions = permissions
        }

        configObj[x] = config
    }

    return {
        state,
        config: configObj
    }
}

export async function getFunctionConfig(
    region: string,
    stage: string,
    path?: string
): Promise<FunctionConfig> {
    const projectPath = path || process.cwd()
    const state: Record<string, string> = {
        '@region': region,
        '@stage': stage
    }

    const lambdaResult = await parseConfig(state, projectPath + '/functions')
    const stepFunctionResult = await parseConfig(
        lambdaResult.state,
        projectPath + '/stepfunctions'
    )

    return {
        lambdaConfig: lambdaResult.config,
        stepFunctionConfig: stepFunctionResult.config
    }
}
