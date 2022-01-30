/**
 * Permission referes to an IAM permission
 */
export interface Permission {
    Effect: string
    Action: string[]
    Resource: string[] | string
}

/**
 * CodeCondig regers to the config.js file that every Lambda
 * and Stepfunction will have in its folder. Typically there will
 * be an index.js or index.json file, which is the code of the
 * Lambda or Stepfunction, and then there will be a config.js
 * file
 */
export interface CodeConfig {
    permissions: Permission[]
    trigger?: string
    alarm: {
        snsTopic?: string
    }
    env: Record<string, string>
}

/**
 * FunctionConfig is an object that contains all lambda
 * and step function configurations. CodeNamr refers to
 * the name of the folder the code is in.
 */
type CodeName = string

export interface FunctionConfig {
    lambdaConfig: Record<CodeName, CodeConfig>
    stepFunctionConfig: Record<CodeName, CodeConfig>
}

/**
 * AppConfig is an object that represents the entire application's
 * config, including all lambda and step function config. This
 * config object + the code makes up the entire app, and will
 * give us enough information to create cloudformation and deploy the app
 */
export interface AppConfig {
    name: string
    stage: string
    region: string
    accountId: string
    bucketName?: string
    lambda: Record<CodeName, CodeConfig>
    stepFunction: Record<CodeName, CodeConfig>
    dashboard: boolean
}
