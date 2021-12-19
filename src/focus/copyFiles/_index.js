const main = require('./index')

/**
 * Code that will be deployed around the above without anyone having to
 * care about it
 */
module.exports.handler = async () => {
    const AWS = require('aws-sdk')
    const invokeLambda = async (name, payload = {}) => {
        const lambda = new AWS.Lambda({
            region: 'us-east-1'
        })
        const params = {
            FunctionName: name,
            LogType: 'Tail',
            InvocationType: 'RequestResponse',
            Payload: JSON.stringify(payload)
        }
        return await lambda.invoke(params).promise()
    }

    let expectations = {}
    let logs = {}
    const expect = (testName) => (v) => {
        return {
            toBe: (ex) => {
                if (
                    expectations[testName] &&
                    expectations[testName].startsWith('Failed')
                ) {
                    return
                }
                if (v === ex) {
                    expectations[testName] = 'Passed'
                }

                if (v !== ex) {
                    expectations[
                        testName
                    ] = `Failed. Expected ${v} to equal ${ex}`
                }
            }
        }
    }

    const contextualInvoke = async (name, payload) => {
        const app = 'risefoundationtests'
        const stage = 'dev'
        const xx = await invokeLambda(`${app}-${name}-${stage}`, payload)

        logs[name] = xx.LogResult
        return JSON.parse(xx.Payload)
    }

    let testRuns = {}
    let listOfPromises = []
    const test = async (testName, testFunction) => {
        const promise = async () => {
            testRuns[testName] = 'Running'
            await testFunction(contextualInvoke, expect(testName))
        }
        listOfPromises.push(promise())
    }

    try {
        main(test)
        await Promise.all(listOfPromises)
        return {
            expectations,
            logs
        }
    } catch (e) {
        return 'Failed: ' + e.message
    }
}
