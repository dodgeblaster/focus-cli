function makeStepFunctionEventRule({
    appName,
    eventBus,
    eventSource,
    eventName,
    stepFunctionName,
    stage
}) {
    return {
        Resources: {
            [`EventListener${appName}${eventName}${stepFunctionName}`]: {
                Type: 'AWS::Events::Rule',
                Properties: {
                    EventBusName: eventBus,
                    EventPattern: {
                        source: [`custom.${eventSource}`],
                        'detail-type': [eventName]
                    },
                    Targets: [
                        {
                            Arn: {
                                'Fn::GetAtt': [
                                    `StepFunction${appName}${stepFunctionName}${stage}`,
                                    'Arn'
                                ]
                            },
                            Id: `EventListener${appName}${eventName}${stepFunctionName}`,
                            RoleArn: {
                                'Fn::GetAtt': [
                                    `EventRuleRole${appName}${eventName}${stepFunctionName}`,
                                    'Arn'
                                ]
                            }
                        }
                    ]
                }
            },

            [`EventRuleRole${appName}${eventName}${stepFunctionName}`]: {
                Type: 'AWS::IAM::Role',
                Properties: {
                    AssumeRolePolicyDocument: {
                        Version: '2012-10-17',
                        Statement: [
                            {
                                Effect: 'Allow',
                                Principal: {
                                    Service: ['events.amazonaws.com']
                                },
                                Action: 'sts:AssumeRole'
                            }
                        ]
                    },
                    Policies: [
                        {
                            PolicyName: `EventRuleRole${appName}${eventName}${stepFunctionName}Policy`,
                            PolicyDocument: {
                                Version: '2012-10-17',
                                Statement: [
                                    {
                                        Effect: 'Allow',
                                        Action: ['states:StartExecution'],
                                        Resource: {
                                            'Fn::GetAtt': [
                                                `StepFunction${appName}${stepFunctionName}${stage}`,

                                                'Arn'
                                            ]
                                        }
                                    }
                                ]
                            }
                        }
                    ]
                }
            }
        },
        Outputs: {}
    }
}

module.exports = {
    makeStepFunctionEventRule
}
