# Rise Focus

## Intro

Rise Focus is a CLI which takes a `focus.js` file, and deploys AWS Lambda and AWS StepFunctions into your AWS account. All lambdas are located in a `/functions` folder, and all step functions are located in a `/stepfunctions` folder. The goal of rise focus is to make building AWS Lambda and AWS StepFunction workflows simple and make developers productive.

## Install

```ts
npm i -g rise-focus
```

## Usage

Deploy

```ts
focus deploy
```

## Project Structure

A rise focus project as the following structure:

```
/functions
    /myFunctionA
        index.js
        config.js
    /myFunctionB
        /node_modules
        index.js
        config.js
/stepfunctions
    /myStepFunctionA
        index.json
        config.js
    /myStepFunctionB
        index.json
        config.js
focus.js
```

## What is the focus.js file for?

The `focus.js` file is for configuring your project. Here is an example:

```js
module.exports = {
    name: 'nameOfMyProject',
    dashboard: true, // optional
    stage: 'qa', // optional
    region: 'us-east-1' // optiona;
}
```

The only required parameter is the name. This will be used to name:

-   the s3 bucket where your code will be uploaded
-   lambda functions
-   stepfunctions
-   iam roles

If dashboard is set to true, the cli will generate a CloudWatch dashboard for your Lambda functions. If stage and region are set, those values will inform the cli which region and stage to deploy to. It is much more common to set these values as cli flags in a CICD pipeline than to hard code them here.

## What CLI flags are available?

You can set the region and stage of your deployment like so:

```
focus deploy --stage=qa --region=us-east-2
```
