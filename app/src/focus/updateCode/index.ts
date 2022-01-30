import foundation from 'rise-foundation'
import cli from 'rise-cli-foundation'

interface LambdaCodeInput {
    appName: string
    stage: string
    bucket: string
}

export async function updateLambdaCode({
    appName,
    stage,
    bucket
}: LambdaCodeInput) {
    const getAllPaths = () => {
        const lambaPaths = process.cwd() + '/functions'
        const lambdas = cli.fileSystem.getDirectories(lambaPaths)

        return [
            ...lambdas.map((x: string) => ({
                path: `lambdas/${x}.zip`,
                name: x
            }))
        ]
    }

    const getFunctionName = (name: string) => `${appName}-${name}-${stage}`
    for (const l of getAllPaths()) {
        const lambdaName = getFunctionName(l.name)

        await foundation.lambda.updateLambdaCode({
            name: lambdaName,
            filePath: l.path,
            bucket: bucket
        })
    }
}

interface StepFunctionCodeInput {
    appName: string
    stage: string
    region: string
    accountId: string
    stepFunctionConfig: any
}

export async function updateStepFunctionCode({
    appName,
    stage,
    region,
    accountId,
    stepFunctionConfig
}: StepFunctionCodeInput) {
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

    for (const x of getAllPaths()) {
        const arn = `arn:aws:states:${region}:${accountId}:stateMachine:${appName}${x.name}${stage}`
        const d = cli.fileSystem.getJsFile(process.cwd() + x.definition)
        await foundation.stepfunctions.updateStepFunctionDefinition({
            arn,
            definition: JSON.stringify(d)
        })
    }
}
