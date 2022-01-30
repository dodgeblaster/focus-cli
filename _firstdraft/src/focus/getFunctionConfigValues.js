const rise = require('riseapp-utils')
const AWS = require('aws-sdk')

const io = rise.default.io

const getOutput = async (str, region) => {
    var cloudformation = new AWS.CloudFormation({
        region
    })

    const stack = str.split('.')[1]
    const value = str.split('.')[2]
    const params = {
        StackName: stack
    }
    const res = await cloudformation.describeStacks(params).promise()

    const outputs = res.Stacks[0].Outputs

    if (outputs.map((x) => x.OutputKey).includes(value)) {
        return outputs.map((x) => ({
            key: x.OutputKey,
            stack: stack,
            value: x.OutputValue
        }))
    } else {
        throw new Error(`${str} not found`)
    }
}

const getSsmParam = async (str, region) => {
    const v = str.split('.')[1]
    const ssm = new AWS.SSM({
        region: region
    })
    const params = {
        Name: v
    }
    const res = await ssm.getParameter(params).promise()
    return res.Parameter.Value
}

const getAccountId = async () => {
    const sts = new AWS.STS()
    const res = await sts.getCallerIdentity({}).promise()
    return res.Account
}

module.exports = async (stage, region) => {
    let valueResultsMap = {
        '@stage': stage,
        '@region': region
    }

    valueResultsMap['@accountId'] = await getAccountId()

    const getString = async (value) => {
        if (value.includes('{') && value.includes('}')) {
            let stringToUse = ''
            let replaceText = []
            let replaceIndex = -1

            let replace = false
            value.split('').forEach((ch, i, l) => {
                if (l[i] === '{' && l[i + 1] === '@') {
                    replaceIndex++
                    replace = true
                } else if (l[i] === '}' && replace) {
                    replace = false
                } else {
                    stringToUse = stringToUse + ch
                    if (replace) {
                        if (!replaceText[replaceIndex]) {
                            replaceText[replaceIndex] = ch
                        } else {
                            replaceText[replaceIndex] =
                                replaceText[replaceIndex] + ch
                        }
                    }
                }
            })

            for (const r of replaceText) {
                if (r.startsWith('@stage')) {
                    stringToUse = stringToUse.replace(
                        r,
                        valueResultsMap['@stage']
                    )
                }

                if (r.startsWith('@region')) {
                    stringToUse = stringToUse.replace(
                        r,
                        valueResultsMap['@region']
                    )
                }

                if (r.startsWith('@accountId')) {
                    stringToUse = stringToUse.replace(
                        r,
                        valueResultsMap['@accountId']
                    )
                }

                if (r.startsWith('@output')) {
                    if (valueResultsMap[r]) {
                        stringToUse = stringToUse.replace(r, valueResultsMap[r])
                    } else {
                        const outputs = await getOutput(r, region)
                        outputs.forEach((x) => {
                            valueResultsMap[`@output.${x.stack}.${x.key}`] =
                                x.value
                        })
                        const theOutput = valueResultsMap[r]

                        stringToUse = stringToUse.replace(r, theOutput)
                    }
                }

                if (r.startsWith('@ssm')) {
                    if (valueResultsMap[r]) {
                        stringToUse = stringToUse.replace(r, valueResultsMap[r])
                    } else {
                        const v = await getSsmParam(r, region)
                        valueResultsMap[r] = v
                        stringToUse = stringToUse.replace(r, v)
                    }
                }
            }

            return stringToUse
        } else {
            return value
        }
    }

    const projectPath = process.cwd()
    const dir = io.fileSystem.getDirectories(projectPath + '/functions')
    let configObj = {}
    for (const x of dir) {
        const path = `${projectPath}/functions/${x}/config.js`
        let lambdaConfig = require(path)
        if (lambdaConfig.env) {
            for (const k of Object.keys(lambdaConfig.env)) {
                lambdaConfig.env[k] = await getString(lambdaConfig.env[k])
            }
        }

        if (lambdaConfig.alarm) {
            if (lambdaConfig.alarm.snsTopic) {
                lambdaConfig.alarm.snsTopic = await getString(
                    lambdaConfig.alarm.snsTopic
                )
            }
        }

        if (lambdaConfig.trigger) {
            lambdaConfig.trigger = await getString(lambdaConfig.trigger)
        }

        if (lambdaConfig.permissions) {
            let permissions = []
            for (const k of lambdaConfig.permissions) {
                const resource = await getString(k.Resource)
                permissions.push({
                    ...k,
                    Resource: resource
                })
            }
            lambdaConfig.permissions = permissions
        }

        configObj[x] = lambdaConfig
    }

    const dir2 = io.fileSystem.getDirectories(projectPath + '/stepfunctions')
    let configObjS = {}
    for (const x of dir2) {
        const path = `${projectPath}/stepfunctions/${x}/config.js`
        const def = `${projectPath}/stepfunctions/${x}/index.json`
        let lambdaConfig = require(path)
        let definition = require(def)
        // if (lambdaConfig.env) {
        //     for (const k of Object.keys(lambdaConfig.env)) {
        //         lambdaConfig.env[k] = await getString(lambdaConfig.env[k])
        //     }
        // }

        // if (lambdaConfig.alarm) {
        //     if (lambdaConfig.alarm.snsTopic) {
        //         lambdaConfig.alarm.snsTopic = await getString(
        //             lambdaConfig.alarm.snsTopic
        //         )
        //     }
        // }

        if (lambdaConfig.substitution) {
            for (const k of Object.keys(lambdaConfig.substitution)) {
                const v = lambdaConfig.substitution[k]
                const val = await getString(v)
                lambdaConfig.substitution[k] = val
            }
        }

        if (lambdaConfig.trigger) {
            lambdaConfig.trigger = await getString(lambdaConfig.trigger)
        }

        if (lambdaConfig.permissions) {
            let permissions = []
            for (const k of lambdaConfig.permissions) {
                const resource = await getString(k.Resource)
                console.log('THE SF resoruce: ', resource)
                permissions.push({
                    ...k,
                    Resource: resource
                })
            }
            lambdaConfig.permissions = permissions
        }

        lambdaConfig.definition = await getString(JSON.stringify(definition))

        configObjS[x] = lambdaConfig
    }

    return {
        lambdaConfig: configObj,
        stepFunctionConfig: configObjS
    }
}
