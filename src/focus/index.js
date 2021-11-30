const rise = require('riseapp-utils')
const foundation = require('rise-foundation')
const fs = require('fs/promises')
const AWS = require('aws-sdk')
const { readFile, copySync, copyFileSync, writeFileSync } = require('fs-extra')
const getFunctionConfigValues = require('./getFunctionConfigValues')
const io = rise.default.io

const HIDDEN_FOLDER = '.focus'

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
            stage: config.region || 'dev'
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
        await fs.mkdir(projectPath + '/' + HIDDEN_FOLDER + '/src/testLambdas')
        await fs.mkdir(projectPath + '/' + HIDDEN_FOLDER + '/src/lambdas')
    }
}

const zipLambdas = async () => {
    /**
     * Define
     */
    const getLambdaFunctionPaths = (folderName) => {
        const functionsPath = process.cwd() + '/' + folderName
        const lambdas = io.fileSystem.getDirectories(functionsPath)
        return lambdas.map((x) => {
            return {
                path: functionsPath + '/' + x,
                name: x
            }
        })
    }

    const zipLambda = async (x, folderName) => {
        const projectPath = process.cwd()

        if (folderName === 'testLambdas') {
            copySync(
                x.path,
                projectPath + '/' + HIDDEN_FOLDER + '/src/testLambdas/' + x.name
            )
            copyFileSync(
                __dirname + '/copyFiles/_index.js',
                projectPath +
                    '/' +
                    HIDDEN_FOLDER +
                    '/src/testLambdas/' +
                    x.name +
                    '/_index.js'
            )
            await io.package.packageCode({
                location:
                    projectPath +
                    '/' +
                    HIDDEN_FOLDER +
                    '/src/testLambdas/' +
                    x.name,
                target: projectPath + '/' + HIDDEN_FOLDER + '/' + folderName,
                name: x.name
            })
        } else {
            await io.package.packageCode({
                location: x.path,
                target: projectPath + '/' + HIDDEN_FOLDER + '/' + folderName,
                name: x.name
            })
        }
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

    const testLambdas = getLambdaFunctionPaths('tests')
    for (const lambda of testLambdas) {
        await zipLambda(
            {
                path: lambda.path,
                name: lambda.name
            },
            'testLambdas'
        )
    }
}

const uploadLambdas = async (name, region, bucketName) => {
    /**
     * Define
     */
    const getAllPaths = () => {
        const lambaPaths = process.cwd() + '/functions'

        const lambdas = io.fileSystem.getDirectories(lambaPaths)
        const testLambaPaths = process.cwd() + '/tests'
        const testLambdas = io.fileSystem.getDirectories(testLambaPaths)
        return [
            ...lambdas.map(
                (x) => `${process.cwd()}/${HIDDEN_FOLDER}/lambdas/${x}.zip`
            ),
            ...testLambdas.map(
                (x) => `${process.cwd()}/${HIDDEN_FOLDER}/testLambdas/${x}.zip`
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

const deployBucketTemplate = async (appName, region) => {
    await foundation.default.cloudformation.deployStack({
        name: appName + '-bucket',
        template: JSON.stringify(foundation.default.s3.cf.makeBucket('Main'))
    })
    await foundation.default.cloudformation.getDeployStatus({
        config: {
            stackName: appName + '-bucket',
            minRetryInterval: 2000,
            maxRetryInterval: 10000,
            backoffRate: 1.1,
            maxRetries: 200,
            onCheck: (resources) => {
                console.log('Creating Bucket...')
            }
        }
    })
    const cloudformation = new AWS.CloudFormation({ region })
    var params = {
        StackName: appName + '-bucket'
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

const deployCfTemplate = async ({
    region,

    appName,
    bucketArn,
    stage,
    config
}) => {
    const getAllPaths = () => {
        const lambaPaths = process.cwd() + '/functions'
        const lambdas = io.fileSystem.getDirectories(lambaPaths)
        const testLambaPaths = process.cwd() + '/tests'
        const testLambdas = io.fileSystem.getDirectories(testLambaPaths)
        return [
            ...lambdas.map((x) => ({
                path: `lambdas/${x}.zip`,
                name: x
            })),
            ...testLambdas.map((x) => ({
                path: `testLambdas/${x}.zip`,
                name: x + 'Test'
            }))
        ]
    }

    let template = {
        Resources: {},
        Outputs: {}
    }

    getAllPaths().forEach((x) => {
        const permissions = config[x.name]
            ? config[x.name].permissions.map((x) => ({
                  ...x,
                  Effect: 'Allow'
              }))
            : []

        if (x.path.startsWith('testLambdas')) {
            permissions.push({
                Effect: 'Allow',
                Action: 'lambda:InvokeFunction',
                Resource: '*'
            })
        }

        const res = foundation.default.lambda.cf.makeLambda({
            appName: appName,
            name: x.name,
            stage: stage,
            bucketArn: bucketArn,
            bucketKey: x.path,
            env: config[x.name] ? config[x.name].env : {},
            handler: x.path.startsWith('testLambdas')
                ? '_index.handler'
                : 'index.handler',
            permissions: permissions
        })

        //console.log('LAMBDA: ', JSON.stringify(res, null, 2))

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
    })

    // console.log(JSON.stringify(template, null, 2))
    // return

    await foundation.default.cloudformation.deployStack({
        name: appName,
        template: JSON.stringify(template)
    })

    await foundation.default.cloudformation.getDeployStatus({
        config: {
            stackName: appName,
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
        const testLambaPaths = process.cwd() + '/tests'
        const testLambdas = io.fileSystem.getDirectories(testLambaPaths)
        return [
            ...lambdas.map((x) => ({
                path: `lambdas/${x}.zip`,
                name: x
            })),
            ...testLambdas.map((x) => ({
                path: `testLambdas/${x}.zip`,
                name: x + 'Test'
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

const invokeLambda = async (name, region, payload = {}) => {
    var lambda = new AWS.Lambda({
        region: region
    })
    var params = {
        FunctionName: name /* required */,
        //ClientContext: 'RequestResponse',
        InvocationType: 'RequestResponse',
        //LogType: None | Tail,
        Payload: JSON.stringify(payload)
    }
    const res = await lambda.invoke(params).promise()
    const testResult = JSON.parse(res.Payload)

    console.log(name)
    Object.keys(testResult).forEach((name) => {
        if (testResult[name].startsWith('Failed')) {
            console.log(`🔴 ${name}: ${testResult[name]}`)
            process.exit(1)
        } else {
            console.log(`🟢 ${name} ${testResult[name]}`)
        }
    })
}

/**
 * Commands
 */

const deploy = async () => {
    makeFocusFolder()
    let config = getConfig()

    if (!config.bucketName) {
        const bucketName = await deployBucketTemplate(
            config.appName,
            config.region
        )

        config.bucketName = bucketName
    }

    const configV = await getFunctionConfigValues(config.stage, config.region)

    console.time('time')

    await zipLambdas()

    await uploadLambdas(config.appName, config.region, config.bucketName)

    await deployCfTemplate({
        region: config.region,
        appName: config.appName,
        bucketArn: 'arn:aws:s3:::' + config.bucketName,
        stage: config.stage,
        config: configV
    })
}

const test = async () => {
    makeFocusFolder()
    const config = getConfig()

    if (!config.bucketName) {
        throw new Error('Must deploy before you are able to test')
    }

    console.time('time')

    await zipLambdas()
    await uploadLambdas(config.appName, config.region, config.bucketName)
    await updateLambdaCode({
        appName: config.appName,
        bucket: config.appName,
        stage: config.stage
    })

    const functionsPath = process.cwd() + '/tests'
    const testLambdas = io.fileSystem.getDirectories(functionsPath)

    for (const testName of testLambdas) {
        const name = `${config.appName}-${testName}Test-${config.stage}`
        await invokeLambda(name, config.region)
    }

    console.timeEnd('time')
}

module.exports = {
    deploy,
    test
}
