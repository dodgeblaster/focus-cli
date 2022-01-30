import { getConfig } from './getConfig'
import { zipLambdas } from './zipFiles'
import { uploadLambdas } from './uploadCode'
import { deployApplicationBucket } from './deploy/deployApplicationBucket'
import { deployApplication } from './deploy/deployApplication'
import { updateLambdaCode, updateStepFunctionCode } from './updateCode'
import { AppConfig } from './interfaces'

export async function deploy(
    stage: string | undefined,
    region: string | undefined
) {
    let config: AppConfig = await getConfig(stage, region)

    await zipLambdas()

    if (!config.bucketName) {
        const bucketName = await deployApplicationBucket(
            config.name,
            config.stage
        )

        config.bucketName = bucketName
    }

    await uploadLambdas(config.bucketName)

    await deployApplication({
        region: config.region,
        appName: config.name,
        bucketArn: 'arn:aws:s3:::' + config.bucketName,
        stage: config.stage,
        config: config.lambda,
        stepFunctionConfig: config.stepFunction,
        dashboard: config.dashboard
    })

    await updateLambdaCode({
        appName: config.name,
        bucket: config.bucketName,
        stage: config.stage
    })

    await updateStepFunctionCode({
        appName: config.name,
        stage: config.stage,
        region: config.region,
        stepFunctionConfig: config.stepFunction,
        accountId: config.accountId
    })
}
