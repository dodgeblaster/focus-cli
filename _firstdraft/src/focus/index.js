const rise = require('riseapp-utils')
const foundation = require('rise-foundation')
const cli = require('rise-cli-foundation')
const fs = require('fs/promises')
const AWS = require('aws-sdk')
const { readFile, writeFileSync } = require('fs-extra')
const getFunctionConfigValues = require('./getFunctionConfigValues')
const io = rise.default.io
const { makeEventRule } = require('./_makeEventRule')
const { makeStepFunctionEventRule } = require('./_makeStepFunctionEventRule')

const HIDDEN_FOLDER = '.focus'

const getAccountId = async () => {
    const sts = new AWS.STS()
    const res = await sts.getCallerIdentity({}).promise()
    return res.Account
}

const getConfig = () => {
    try {
        const config = require(process.cwd() + '/focus.js')
        let bucketName = undefined
        try {
            const data = require(process.cwd() + '/.focus/data.js')
            bucketName = data.bucketName
        } catch (e) {
            bucketName = undefined
        }

        return {
            appName: config.name,
            bucketName: bucketName,
            region: config.region || 'us-east-1',
            stage: config.region || 'dev',
            dashboard: config.dashboard || false
        }
    } catch (e) {
        throw new Error('Must have a focus.js file')
    }
}

const makeFocusFolder = async () => {
    const projectPath = process.cwd()
    const dir = io.fileSystem.getDirectories(projectPath)
    if (!dir.includes(HIDDEN_FOLDER)) {
        await fs.mkdir(projectPath + '/' + HIDDEN_FOLDER)
    }

    const dir2 = io.fileSystem.getDirectories(projectPath + '/' + HIDDEN_FOLDER)
    if (!dir2.includes('lambdas')) {
        await fs.mkdir(projectPath + '/' + HIDDEN_FOLDER + '/lambdas')
    }

    const dir3 = io.fileSystem.getDirectories(projectPath + '/' + HIDDEN_FOLDER)
    if (!dir3.includes('src')) {
        await fs.mkdir(projectPath + '/' + HIDDEN_FOLDER + '/src')
        await fs.mkdir(projectPath + '/' + HIDDEN_FOLDER + '/src/lambdas')
    }
}

const zipLambdas = async () => {
    /**
     * Define
     */
    const getLambdaFunctionPaths = (folderName) => {
        let lambdas = []
        const functionsPath = process.cwd() + '/' + folderName
        try {
            lambdas = io.fileSystem.getDirectories(functionsPath)
        } catch (e) {
            // leave as empty array
        }

        return lambdas.map((x) => {
            return {
                path: functionsPath + '/' + x,
                name: x
            }
        })
    }

    const zipLambda = async (x, folderName) => {
        const projectPath = process.cwd()

        await io.package.packageCode({
            location: x.path,
            target: projectPath + '/' + HIDDEN_FOLDER + '/' + folderName,
            name: x.name
        })
    }

    /**
     * Execute
     */
    const lambdas = getLambdaFunctionPaths('functions')

    for (const lambda of lambdas) {
        await zipLambda(
            {
                path: lambda.path,
                name: lambda.name
            },
            'lambdas'
        )
    }
}

const uploadLambdas = async (region, bucketName) => {
    /**
     * Define
     */
    const getAllPaths = () => {
        const lambaPaths = process.cwd() + '/functions'
        const lambdas = io.fileSystem.getDirectories(lambaPaths)

        return [
            ...lambdas.map(
                (x) => `${process.cwd()}/${HIDDEN_FOLDER}/lambdas/${x}.zip`
            )
        ]
    }
    const getFile = async (path) => {
        return await readFile(path)
    }
    const uploadFile = async (key, file) => {
        await io.s3.uploadToS3(AWS)({
            file: file,
            bucket: bucketName,
            key: key.split(HIDDEN_FOLDER + '/')[1],
            region: region
        })
    }

    /**
     * Execute
     */
    const paths = getAllPaths()
    for (const path of paths) {
        const file = await getFile(path)
        await uploadFile(path, file)
    }
}

const deployBucketTemplate = async (appName, stage, region) => {
    await foundation.default.cloudformation.deployStack({
        name: appName + stage + '-bucket',
        template: JSON.stringify(foundation.default.s3.cf.makeBucket('Main'))
    })
    await foundation.default.cloudformation.getDeployStatus({
        config: {
            stackName: appName + stage + '-bucket',
            minRetryInterval: 2000,
            maxRetryInterval: 10000,
            backoffRate: 1.1,
            maxRetries: 200,
            onCheck: () => {
                console.log('Creating Bucket...')
            }
        }
    })
    const cloudformation = new AWS.CloudFormation({ region })
    var params = {
        StackName: appName + stage + '-bucket'
    }
    const res = await cloudformation.describeStacks(params).promise()
    const bucketName = res.Stacks[0].Outputs.find(
        (x) => x.OutputKey === 'MainBucket'
    ).OutputValue

    writeFileSync(
        process.cwd() + '/.focus/data.js',
        `module.exports = { bucketName: "${bucketName}"}`
    )
    return bucketName
}

const getStepFunctionDefinitions = async () => {
    const getAllPaths = () => {
        try {
            const sPaths = process.cwd() + '/stepfunctions'
            const stepfunctions = io.fileSystem.getDirectories(sPaths)

            return [
                ...stepfunctions.map((x) => ({
                    config: `/stepfunctions/${x}/config.js`,
                    definition: `/stepfunctions/${x}/index.json`,
                    name: x
                }))
            ]
        } catch (e) {
            if (e.message.includes('no such file or directory')) {
                return []
            } else {
                throw new Error(e)
            }
        }
    }

    let res = []
    for (const x of getAllPaths()) {
        const c = io.fileSystem.getJsFile(process.cwd() + x.config)
        const d = io.fileSystem.getJsFile(process.cwd() + x.definition)
        res.push({
            config: c,
            definition: d,
            name: x.name
        })
    }

    return res
}

const deployCfTemplate = async ({
    region,
    appName,
    bucketArn,
    stage,
    config,
    stepFunctionConfig,
    dashboard
}) => {
    const getAllPaths = () => {
        const lambaPaths = process.cwd() + '/functions'
        const lambdas = io.fileSystem.getDirectories(lambaPaths)

        return [
            ...lambdas.map((x) => ({
                path: `lambdas/${x}.zip`,
                name: x
            }))
        ]
    }

    const getLambdaPaths = () => {
        const lambaPaths = process.cwd() + '/functions'
        const lambdas = io.fileSystem.getDirectories(lambaPaths)

        return [
            ...lambdas.map((x) => ({
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
        const cfDashboard = foundation.default.cloudwatch.cf.makeDashboard({
            name: `${appName}${stage}`,
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
                    row.invocationAlarm = dConfig.invocationAlarm
                }
                if (dConfig.invocationGoal) {
                    row.invocationGoal = dConfig.invocationGoal
                }
                if (dConfig.errorAlarm) {
                    row.errorAlarm = dConfig.errorAlarm
                }
                if (dConfig.errorGoal) {
                    row.errorGoal = dConfig.errorGoal
                }
                if (dConfig.durationAlarm) {
                    row.durationAlarm = dConfig.durationAlarm
                }
                if (dConfig.durationGoal) {
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
            const cf = foundation.default.cloudwatch.cf.makeLambdaErrorAlarm({
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
    getAllPaths().forEach((x) => {
        const permissions = config[x.name]
            ? config[x.name].permissions.map((x) => ({
                  ...x,
                  Effect: 'Allow'
              }))
            : []

        const res = foundation.default.lambda.cf.makeLambda({
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
                ? stepFunctionConfig[d.name].permissions.map((x) => ({
                      ...x,
                      Effect: 'Allow'
                  }))
                : []

        const substitution =
            stepFunctionConfig[d.name] &&
            stepFunctionConfig[d.name].substitution
                ? stepFunctionConfig[d.name].substitution
                : {}

        const cf = foundation.default.stepfunctions.cf.makeStepFunction({
            appName: appName,
            name: `${appName}${d.name}${stage}`,
            stage,
            definition: stepFunctionConfig[d.name].definition,
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
                stepFunctionName: `${d.name}${stage}`,
                stage
            })
            template.Resources = {
                ...template.Resources,
                ...cf.Resources
            }
        }
    })

    await foundation.default.cloudformation.deployStack({
        name: appName + stage,
        template: JSON.stringify(template)
    })

    await foundation.default.cloudformation.getDeployStatus({
        config: {
            stackName: appName + stage,
            minRetryInterval: 5000,
            maxRetryInterval: 10000,
            backoffRate: 1.1,
            maxRetries: 200,
            onCheck: (resources) => {
                console.log(JSON.stringify(resources, null, 2))
            }
        }
    })
}

const updateLambdaCode = async ({ appName, stage, bucket }) => {
    const getAllPaths = () => {
        const lambaPaths = process.cwd() + '/functions'
        const lambdas = io.fileSystem.getDirectories(lambaPaths)

        return [
            ...lambdas.map((x) => ({
                path: `lambdas/${x}.zip`,
                name: x
            }))
        ]
    }

    const getFunctionName = (name) => `${appName}-${name}-${stage}`
    for (const l of getAllPaths()) {
        const lambdaName = getFunctionName(l.name)

        await foundation.default.lambda.updateLambdaCode({
            name: lambdaName,
            filePath: l.path,
            bucket: bucket
        })
    }
}

const updateStepFunctionCode = async ({
    appName,
    stage,
    region,
    accountId,
    stepFunctionConfig
}) => {
    const getAllPaths = () => {
        try {
            const sPaths = process.cwd() + '/stepfunctions'
            const stepfunctions = io.fileSystem.getDirectories(sPaths)

            return [
                ...stepfunctions.map((x) => ({
                    config: `/stepfunctions/${x}/config.js`,
                    definition: `/stepfunctions/${x}/index.json`,
                    name: x
                }))
            ]
        } catch (e) {
            if (e.message.includes('no such file or directory')) {
                return []
            } else {
                throw new Error(e)
            }
        }
    }

    for (const x of getAllPaths()) {
        //const d = io.fileSystem.getJsFile(process.cwd() + x.definition)
        const arn = `arn:aws:states:${region}:${accountId}:stateMachine:${appName}${x.name}${stage}`
        console.log('the arn: ', arn)
        await foundation.default.stepfunctions.updateStepFunctionDefinition({
            arn,
            definition: stepFunctionConfig[x.name].definition
        })
    }
}

/**
 * Commands
 */

const deploy = async (stage, region) => {
    /**
     * Get Config
     */
    makeFocusFolder()
    let config = getConfig()

    if (stage) {
        config.stage = stage
    }

    if (region) {
        config.region = region
    }

    config.accountId = await getAccountId()

    const { lambdaConfig, stepFunctionConfig } = await getFunctionConfigValues(
        config.stage,
        config.region
    )

    /**
     * Zip Lambdas
     */
    await zipLambdas()

    /**
     * Deploy
     */

    // deploy bucket
    if (!config.bucketName) {
        const bucketName = await deployBucketTemplate(
            config.appName,
            config.stage,
            config.region
        )

        config.bucketName = bucketName
    }

    // upload lambda
    await uploadLambdas(config.region, config.bucketName)

    // deploy app
    await deployCfTemplate({
        region: config.region,
        appName: config.appName,
        bucketArn: 'arn:aws:s3:::' + config.bucketName,
        stage: config.stage,
        config: lambdaConfig,
        stepFunctionConfig: stepFunctionConfig,
        dashboard: config.dashboard
    })

    // update lambda (if no deployment)
    await updateLambdaCode({
        appName: config.appName,
        bucket: config.bucketName,
        stage: config.stage
    })

    // update step function (if no deployment)
    await updateStepFunctionCode({
        appName: config.appName,
        stage: config.stage,
        region: config.region,
        stepFunctionConfig: stepFunctionConfig,
        accountId: config.accountId
    })
}

module.exports = {
    deploy
}
