module.exports = {
    name: 'rise-focus-pipeline',
    stages: [
        {
            name: 'Source',
            actions: [
                {
                    type: 'SOURCE',
                    name: 'GithubRepo',
                    repo: 'focus-cli',
                    owner: 'dodgeblaster',
                    outputArtifact: 'sourceZip'
                }
            ]
        },
        {
            name: 'Prod',
            actions: [
                {
                    type: 'BUILD',
                    name: 'Test',
                    script: '/test.yml',
                    inputArtifact: 'sourceZip',
                    outputArtifact: 'testZip'
                },
                {
                    type: 'BUILD',
                    name: 'PublishToNpm',
                    script: '/publish.yml',
                    env: {
                        NPM_TOKEN: '@secret.NPM_KEY'
                    },
                    inputArtifact: 'sourceZip',
                    outputArtifact: 'publishedZip'
                },
                {
                    type: 'VERCEL',
                    name: 'DeployDocs',
                    prod: true,
                    path: './docs',
                    token: '@secret.VERCEL_TOKEN'
                }
            ]
        }
    ]
}
