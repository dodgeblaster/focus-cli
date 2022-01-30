import foundation from 'rise-foundation'
const fs = require('fs')

export async function deployApplicationBucket(
    appName: string,
    stage: string
): Promise<string> {
    /**
     * Deploy Stack
     */
    const bucketTemplate = foundation.s3.cf.makeBucket('Main')
    const stackName = appName + stage + '-bucket'

    await foundation.cloudformation.deployStack({
        name: stackName,
        template: JSON.stringify(bucketTemplate)
    })

    await foundation.cloudformation.getDeployStatus({
        config: {
            stackName: stackName,
            minRetryInterval: 2000,
            maxRetryInterval: 10000,
            backoffRate: 1.1,
            maxRetries: 200,
            onCheck: () => {
                console.log('Creating Bucket...')
            }
        }
    })

    /**
     * Write generated bucket name to local state
     */
    const { MainBucket } =
        await foundation.cloudformation.getCloudFormationOutputs({
            stack: stackName,
            outputs: ['MainBucket']
        })

    fs.writeFileSync(
        process.cwd() + '/.focus/data.js',
        `module.exports = { bucketName: "${MainBucket}"}`
    )
    return MainBucket
}
