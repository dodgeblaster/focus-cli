import { zipLambdas } from './index'
const fs = require('fs')

test('getFunctionConfig will return lambda config', async () => {
    const path = process.cwd() + '/src/focus/zipFiles/test'
    await zipLambdas(path)

    const result = fs.readdirSync(
        process.cwd() + '/src/focus/zipFiles/test/.focus/lambdas'
    )
    expect(result).toEqual(['lambdaA.zip', 'lambdaB.zip'])
})
