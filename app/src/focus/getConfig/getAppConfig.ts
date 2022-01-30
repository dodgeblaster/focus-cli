export function getAppConfig(path?: string) {
    const folderPath = path || process.cwd()
    try {
        const config = require(folderPath + '/focus.js')
        let bucketName = undefined
        try {
            const data = require(folderPath + '/.focus/data.js')
            bucketName = data.bucketName
        } catch (e) {
            bucketName = undefined
        }

        return {
            appName: config.name,
            bucketName: bucketName,
            region: config.region || 'us-east-1',
            stage: config.stage || 'dev',
            dashboard: config.dashboard ? true : false
        }
    } catch (e) {
        throw new Error('Must have a focus.js file')
    }
}
