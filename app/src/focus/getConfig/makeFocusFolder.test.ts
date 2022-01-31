import { makeFocusFolder } from './makeFocusFolder'
import cli from 'rise-cli-foundation'

test('can make focus folders', async () => {
    const current = await cli.fileSystem.getDirectories(
        process.cwd() + '/src/focus/getConfig/test/'
    )

    if (!current.includes('makeFolderTest')) {
        await cli.fileSystem.makeDir(
            process.cwd() + '/src/focus/getConfig/test/makeFolderTest'
        )
    }

    const path = process.cwd() + '/src/focus/getConfig/test/makeFolderTest'
    await makeFocusFolder(path)

    // .focus is made
    const projectFolders = await cli.fileSystem.getDirectories(path)
    expect(projectFolders).toEqual(['.focus'])

    // .focus/lambdas is made
    const focusFolders = await cli.fileSystem.getDirectories(path + '/.focus')
    expect(focusFolders).toEqual(['lambdas', 'src'])

    // .focus/src/lambdas is made
    const srcFolders = await cli.fileSystem.getDirectories(path + '/.focus/src')
    expect(srcFolders).toEqual(['lambdas'])
})
