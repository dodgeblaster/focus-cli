import { uploadLambdas } from './index'
jest.mock('rise-foundation', () => {
    return {
        __esModule: true,
        default: {
            s3: {
                uploadFile: jest.fn(
                    (props: { file: string; bucket: string; key: string }) => {
                        return `${props.bucket}${props.key}`
                    }
                )
            }
        }
    }
})

test('uploadCode will upload all lambda zip files', async () => {
    const path = process.cwd() + '/src/focus/uploadCode/test'
    const result = await uploadLambdas('my-test-bucket', path)

    expect(result).toEqual([
        'my-test-bucketlambdas/lambdaA.zip',
        'my-test-bucketlambdas/lambdaB.zip'
    ])
})
