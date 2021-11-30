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

module.exports = async (stage, region) => {
    let valueResultsMap = {
        '@stage': stage,
        '@region': region
    }

    const getString = async (value) => {
        if (value.includes('{') && value.includes('}')) {
            let stringToUse = ''
            let replaceText = []
            let replaceIndex = -1

            let replace = false
            value.split('').forEach((ch, i, l) => {
                if (l[i] === '{') {
                    replaceIndex++
                    replace = true
                } else if (l[i] === '}') {
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

    return configObj
}
