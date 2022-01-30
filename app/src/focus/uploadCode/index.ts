import cli from 'rise-cli-foundation'
import foundation from 'rise-foundation'
const HIDDEN_FOLDER = '.focus'

export async function uploadLambdas(bucketName: string, path?: string) {
    const pathDir = path || process.cwd()

    const getAllPaths = () => {
        const lambaPaths = pathDir + '/functions'
        const lambdas = cli.fileSystem.getDirectories(lambaPaths)
        return lambdas.map(
            (name: string) => `${pathDir}/${HIDDEN_FOLDER}/lambdas/${name}.zip`
        )
    }

    let result = []
    const paths = getAllPaths()
    for (const path of paths) {
        const file = await cli.fileSystem.getFile(path)
        const res = await foundation.s3.uploadFile({
            file,
            bucket: bucketName,
            key: path.split(HIDDEN_FOLDER + '/')[1]
        })
        result.push(res)
    }

    return result
}
