interface Input {
    appName: string
    eventBus: string
    eventSource: string
    eventName: string
    stepFunctionName: string
    stage: string
}

export function makeStepFunctionEventRule({
    appName,
    eventBus,
    eventSource,
    eventName,
    stepFunctionName,
    stage
}: Input) {
    return {
        Resources: {
            [`EventListener${eventName}${stepFunctionName}`]: {
                Type: 'AWS::Events::Rule',
                Properties: {
                    EventBusName: eventBus,
                    EventPattern: {
                        source: [`custom.${eventSource}`],
                        'detail-type': [eventName]
                    },

                    //StepFunction orderStatusUpdate staging
                    //StepFunctionc offeecore orderStatusUpdate staging
                    Targets: [
                        {
                            Arn: {
                                'Fn::GetAtt': [
                                    `StepFunction${stepFunctionName}${stage}`,
                                    'Arn'
                                ]
                            },
                            Id: `EventListener${eventName}${stepFunctionName}`,
                            RoleArn: {
                                'Fn::GetAtt': [
                                    `EventRuleRole${eventName}${stepFunctionName}`,
                                    'Arn'
                                ]
                            }
                        }
                    ]
                }
            },

            [`EventRuleRole${eventName}${stepFunctionName}`]: {
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
                            PolicyName: `EventRuleRole${eventName}${stepFunctionName}Policy`,
                            PolicyDocument: {
                                Version: '2012-10-17',
                                Statement: [
                                    {
                                        Effect: 'Allow',
                                        Action: ['states:StartExecution'],
                                        Resource: {
                                            'Fn::GetAtt': [
                                                `StepFunction${stepFunctionName}${stage}`,

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
