import { getAppConfig } from './getAppConfig'

test('getAppConfig will throw error if no focus.js file is present', async () => {
    try {
        await getAppConfig(
            process.cwd() +
                '/src/focus/getConfig/test/getAppConfig/withoutConfigFile'
        )
    } catch (e: any) {
        expect(e.message).toBe('Must have a focus.js file')
    }
})

test('getAppConfig will return config from focus.js file', async () => {
    const res = await getAppConfig(
        process.cwd() + '/src/focus/getConfig/test/getAppConfig/withConfigFile'
    )

    expect(res).toEqual({
        appName: 'testapp',
        bucketName: undefined,
        region: 'regionA',
        stage: 'qa',
        dashboard: true
    })
})

test('getAppConfig will return config from focus.js file with bucketName if data.js is defined', async () => {
    const res = await getAppConfig(
        process.cwd() +
            '/src/focus/getConfig/test/getAppConfig/withConfigAndData'
    )

    expect(res).toEqual({
        appName: 'testapp',
        bucketName: 'testbucket',
        region: 'regionA',
        stage: 'qa',
        dashboard: true
    })
})
