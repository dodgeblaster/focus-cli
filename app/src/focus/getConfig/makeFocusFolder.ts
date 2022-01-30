import cli from 'rise-cli-foundation'
const HIDDEN_FOLDER = '.focus'

export async function makeFocusFolder(path?: string) {
    const projectPath = path || process.cwd()

    /**
     * Create focus folder
     */
    const projectFolder = cli.fileSystem.getDirectories(projectPath)
    if (!projectFolder.includes(HIDDEN_FOLDER)) {
        await cli.fileSystem.makeDir(projectPath + '/' + HIDDEN_FOLDER)
    }

    /**
     * Create lambda folder
     */
    const focusFolder = cli.fileSystem.getDirectories(
        projectPath + '/' + HIDDEN_FOLDER
    )
    if (!focusFolder.includes('lambdas')) {
        await cli.fileSystem.makeDir(
            projectPath + '/' + HIDDEN_FOLDER + '/lambdas'
        )
    }

    /**
     * Create src folder
     */
    if (!focusFolder.includes('src')) {
        await cli.fileSystem.makeDir(projectPath + '/' + HIDDEN_FOLDER + '/src')
        await cli.fileSystem.makeDir(
            projectPath + '/' + HIDDEN_FOLDER + '/src/lambdas'
        )
    }
}
