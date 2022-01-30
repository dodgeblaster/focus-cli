import { makeFocusFolder } from './makeFocusFolder'
import { getAppConfig } from './getAppConfig'
import { getAccountId } from './getAccountId'
import { getFunctionConfig } from './getFunctionConfig'
import { AppConfig } from '../interfaces'

export async function getConfig(
    stage: string | undefined,
    region: string | undefined
): Promise<AppConfig> {
    makeFocusFolder()
    let config: Record<string, any> = getAppConfig()
    if (stage) {
        config.stage = stage
    }
    if (region) {
        config.region = region
    }
    config.accountId = await getAccountId()
    const { lambdaConfig, stepFunctionConfig } = await getFunctionConfig(
        config.region,
        config.stage
    )

    return {
        name: config.appName,
        stage: config.stage,
        region: config.region,
        accountId: config.accountId,
        bucketName: config.bucketName,
        lambda: lambdaConfig,
        stepFunction: stepFunctionConfig,
        dashboard: config.dashboard
    }
}
