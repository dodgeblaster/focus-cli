import { getAppConfig } from './getAppConfig'
import cli from 'rise-cli-foundation'

test('getAppConfig will throw error if no focus.js file is present', async () => {
    const current = await cli.fileSystem.getDirectories(
        process.cwd() + '/src/focus/getConfig/test/getAppConfig'
    )

    if (!current.includes('withoutConfigFile')) {
        await cli.fileSystem.makeDir(
            process.cwd() +
                '/src/focus/getConfig/test/getAppConfig/withoutConfigFile'
        )
    }

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
