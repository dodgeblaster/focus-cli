import cli from 'rise-cli-foundation'
const HIDDEN_FOLDER = '.focus'

function getLambdaFunctionPaths(path: string, folderName: string) {
    let lambdas = []
    const functionsPath = path + '/' + folderName
    try {
        lambdas = cli.fileSystem.getDirectories(functionsPath)
    } catch (e) {
        lambdas = []
    }

    return lambdas.map((name: string) => {
        return {
            path: functionsPath + '/' + name,
            name
        }
    })
}

export async function zipLambdas(path?: string) {
    const dirPath = path || process.cwd()
    const lambdas = getLambdaFunctionPaths(dirPath, 'functions')
    for (const lambda of lambdas) {
        await cli.fileSystem.packageCode({
            location: lambda.path,
            target: dirPath + '/' + HIDDEN_FOLDER + '/lambdas',
            name: lambda.name
        })
    }
}
