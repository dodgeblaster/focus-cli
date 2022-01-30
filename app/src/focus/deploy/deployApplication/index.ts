import foundation from 'rise-foundation'
import cli from 'rise-cli-foundation'
import { makeEventRule } from './makeEventRule'
import { makeStepFunctionEventRule } from './makeStepFunctionEventRule'

type Input = {
    region: string
    appName: string
    bucketArn: string
    stage: string
    config: any
    stepFunctionConfig: any
    dashboard: boolean
}

const getStepFunctionDefinitions = async () => {
    const getAllPaths = () => {
        try {
            const sPaths = process.cwd() + '/stepfunctions'
            const stepfunctions = cli.fileSystem.getDirectories(sPaths)

            return [
                ...stepfunctions.map((x: string) => ({
                    config: `/stepfunctions/${x}/config.js`,
                    definition: `/stepfunctions/${x}/index.json`,
                    name: x
                }))
            ]
        } catch (e: any) {
            if (e.message.includes('no such file or directory')) {
                return []
            } else {
                throw new Error(e)
            }
        }
    }

    let res = []
    for (const x of getAllPaths()) {
        const c = cli.fileSystem.getJsFile(process.cwd() + x.config)
        const d = cli.fileSystem.getJsFile(process.cwd() + x.definition)
        res.push({
            config: c,
            definition: d,
            name: x.name
        })
    }

    return res
}

export async function deployApplication({
    region,
    appName,
    bucketArn,
    stage,
    config,
    stepFunctionConfig,
    dashboard
}: Input) {
    const getLambdaPaths = () => {
        const lambaPaths = process.cwd() + '/functions'
        const lambdas = cli.fileSystem.getDirectories(lambaPaths)

        return [
            ...lambdas.map((x: string) => ({
                path: `lambdas/${x}.zip`,
                name: x
            }))
        ]
    }

    let template = {
        Resources: {},
        Outputs: {}
    }

    /**
     * Dashboard
     *
     */
    if (dashboard) {
        const cfDashboard = foundation.cloudwatch.cf.makeDashboard({
            name: `${appName}${stage}`,
            // @ts-ignore
            rows: getLambdaPaths().map((l, i) => {
                const dConfig =
                    config[l.name] && config[l.name].dashboard
                        ? config[l.name].dashboard
                        : false

                if (!dConfig) {
                    return {
                        type: 'LAMBDAROW',
                        verticalPosition: i,
                        name: l.name,
                        region: region,
                        functionName: `${appName}-${l.name}-${stage}`,
                        docs: `# ${l.name}`
                    }
                }

                let row = {
                    type: 'LAMBDAROW',
                    verticalPosition: i,
                    name: l.name,
                    region: region,
                    functionName: `${appName}-${l.name}-${stage}`,
                    docs: dConfig.doc || `# ${l.name}`
                }

                if (dConfig.invocationAlarm) {
                    // @ts-ignore
                    row.invocationAlarm = dConfig.invocationAlarm
                }
                if (dConfig.invocationGoal) {
                    // @ts-ignore
                    row.invocationGoal = dConfig.invocationGoal
                }
                if (dConfig.errorAlarm) {
                    // @ts-ignore
                    row.errorAlarm = dConfig.errorAlarm
                }
                if (dConfig.errorGoal) {
                    // @ts-ignore
                    row.errorGoal = dConfig.errorGoal
                }
                if (dConfig.durationAlarm) {
                    // @ts-ignore
                    row.durationAlarm = dConfig.durationAlarm
                }
                if (dConfig.durationGoal) {
                    // @ts-ignore
                    row.durationGoal = dConfig.durationGoal
                }

                return row
            })
        })

        template.Resources = {
            ...template.Resources,
            ...cfDashboard.Resources
        }
    }

    /**
     * Alarms
     *
     */
    getLambdaPaths().map((l, i) => {
        const aConfig =
            config[l.name] && config[l.name].alarm
                ? config[l.name].alarm
                : false

        if (aConfig) {
            const cf = foundation.cloudwatch.cf.makeLambdaErrorAlarm({
                appName,
                stage,
                name: l.name + 'Alarm',
                description: aConfig.description || '',
                functionName: `${appName}-${l.name}-${stage}`,
                threshold: aConfig.threshold,
                period: aConfig.period || 300,
                evaluationPeriods: aConfig.evaluationPeriods || 3,
                snsTopic: aConfig.snsTopic || undefined
            })

            template.Resources = {
                ...template.Resources,
                ...cf.Resources
            }
        }
    })

    /**
     * Make Lamnda CF
     *
     */
    getLambdaPaths().forEach((x) => {
        const permissions = config[x.name]
            ? config[x.name].permissions.map((x: any) => ({
                  ...x,
                  Effect: 'Allow'
              }))
            : []

        const res = foundation.lambda.cf.makeLambda({
            appName: appName,
            name: x.name,
            stage: stage,
            bucketArn: bucketArn,
            bucketKey: x.path,
            env: config[x.name] ? config[x.name].env : {},
            handler: 'index.handler',
            permissions: permissions,
            timeout:
                config[x.name] && config[x.name].timeout
                    ? config[x.name].timeout
                    : 6,
            layers: config[x.name] ? config[x.name].layers : []
        })

        template.Resources = {
            ...template.Resources,
            ...res.Resources
        }
        template.Outputs = {
            ...template.Outputs,
            ...{
                [`Lambda${x.name}${stage}Arn`]: {
                    Value: {
                        'Fn::GetAtt': [`Lambda${x.name}${stage}`, 'Arn']
                    }
                }
            }
        }

        if (config[x.name].trigger) {
            const cf = makeEventRule({
                appName: appName + stage,
                eventBus: 'default',
                eventSource: config[x.name].trigger.split('_')[0],
                eventName: config[x.name].trigger.split('_')[1],
                lambdaName: `Lambda${x.name}${stage}`
            })
            template.Resources = {
                ...template.Resources,
                ...cf.Resources
            }
        }
    })

    const sf = await getStepFunctionDefinitions()
    sf.forEach((d) => {
        const permissions =
            stepFunctionConfig[d.name] && stepFunctionConfig[d.name].permissions
                ? stepFunctionConfig[d.name].permissions.map((x: any) => ({
                      ...x,
                      Effect: 'Allow'
                  }))
                : []

        const substitution =
            stepFunctionConfig[d.name] &&
            stepFunctionConfig[d.name].substitution
                ? stepFunctionConfig[d.name].substitution
                : {}

        const cf = foundation.stepfunctions.cf.makeStepFunction({
            appName: appName,
            name: d.name,
            stage,
            definition: JSON.stringify(d.definition),
            substitution: substitution,
            permissions: permissions
        })

        template.Resources = {
            ...template.Resources,
            ...cf.Resources
        }

        if (stepFunctionConfig[d.name].trigger) {
            const cf = makeStepFunctionEventRule({
                appName: appName,
                eventBus: 'default',
                eventSource: stepFunctionConfig[d.name].trigger.split('_')[0],
                eventName: stepFunctionConfig[d.name].trigger.split('_')[1],
                stepFunctionName: `${d.name}`,
                stage
            })

            template.Resources = {
                ...template.Resources,
                ...cf.Resources
            }
        }
    })

    await foundation.cloudformation.deployStack({
        name: appName + stage,
        template: JSON.stringify(template)
    })

    await foundation.cloudformation.getDeployStatus({
        config: {
            stackName: appName + stage,
            minRetryInterval: 5000,
            maxRetryInterval: 10000,
            backoffRate: 1.1,
            maxRetries: 200,
            onCheck: (resources: any) => {
                console.log(JSON.stringify(resources, null, 2))
            }
        }
    })
}
