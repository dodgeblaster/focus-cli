module.exports = {
    permissions: [
        {
            Effect: 'Allow',
            Action: '*',
            Resource: '{@output.ExampleStack.Example}'
        }
    ],
    trigger: '{@output.ExampleStack.Example}',
    alarm: {
        snsTopic: '{@output.ExampleStack.Example}'
    },
    env: {
        bucket: '{@output.ExampleStack.Example}'
    }
}
