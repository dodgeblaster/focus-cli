import { getFunctionConfig } from './getFunctionConfig'

jest.mock('rise-foundation', () => {
    return {
        __esModule: true,
        default: {
            keywords: {
                getKeyword: jest.fn(() => ({
                    state: {
                        '@output.ExampleStack.Example': 'bucket_1234'
                    },
                    result: 'bucket_1234'
                }))
            }
        }
    }
})

test('getFunctionConfig will return lambda config', async () => {
    const x = await getFunctionConfig(
        'us-east-1',
        'qa',
        process.cwd() +
            '/src/focus/getConfig/test/getFunctionConfig/hasFunctions'
    )

    expect(x).toEqual({
        lambdaConfig: {
            a: {
                permissions: [
                    { Effect: 'Allow', Action: '*', Resource: 'bucket_1234' }
                ],
                trigger: 'bucket_1234',
                alarm: { snsTopic: 'bucket_1234' },
                env: { bucket: 'bucket_1234' }
            }
        },
        stepFunctionConfig: {
            b: {
                permissions: [
                    { Effect: 'Allow', Action: '*', Resource: 'bucket_1234' }
                ],
                trigger: 'bucket_1234',
                alarm: { snsTopic: 'bucket_1234' },
                env: { bucket: 'bucket_1234' }
            }
        }
    })
})
