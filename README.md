# Word count webhook
This is a simple Github webhook that counts the word additions and deletions on each git commit. It's built using the Serverless Framework and runs on AWS Lambda. I'm using it to track the number of words written each day for a [Gitbook](https://www.gitbook.com) repository.

## How it works
### Usage
Two API Gateway routes are be created. The */webhook* route receives a notification from Github on each repository push with a list of updated commits and then counts the word changes for each commit. Results are saved to a DynamoDB table with the commit *sha* as the partition key and *timestamp* as a sort key. 

The */commits* route is used to access the commit count results. You should make GET requests to the */commits* URL with an *X-Authorization* header that is set to the same value as *API_KEY* in *config.json*. You can append a *limit* key to the query string to limit the number of commit counts to receive. For example to get the 100 most recent commit counts your URL would look like the following - https://apigatewayurl/dev/commits?limit=100. Responses to */commits* are returned in JSON in the below format.
``` json
{
  "message": "2 commits returned",
  "commits": [
    {
      "sha": "eda0113e75372bed13acc2267749e2dd68cd0b3e",
      "wordCount": {
        "deleted": 15,
        "added": 89,
        "net": 74
      },
      "timestamp": "1492436314000"
    },
    {
      "sha": "79e2dd3e8c7475372be0b3ed13acc226da0116ed",
      "wordCount": {
        "deleted": 0,
        "added": 77,
        "net": 77
      },
      "timestamp": "1492235102000"
    }
  ]
}
```

### Counting
The webhook works by looking at the git patches for each changed file of a git commit. A count of the occurences of each word is made and the difference is calculated. The following regex pattern is used when counting words in the git patch. Only full words are counted and if a word is separated by a character it will be counted as separate words. For example 'state-of-the-art' would be counted as four words.
``` bash
/[a-zA-Z0-9_\u0392-\u03c9\u0400-\u04FF]+|[\u4E00-\u9FFF\u3400-\u4dbf\uf900-\ufaff\u3040-\u309f\uac00-\ud7af\u0400-\u04FF]+|[\u00E4\u00C4\u00E5\u00C5\u00F6\u00D6]+|\w+/g
```

### Example
``` bash
- The quick brown fox jumps over the lazy dog.\n
+ The fox jumps over the cat.\n

# before: brown dog fox jumps lazy over quick (1), the (2)
# after: cat fox jumps over (1), the (2)
# result: brown dog lazy quick (-1), cat (+1) => added 1, deleted 4 
```

## Getting started
### Creating the config
Make a copy of *config.sample.json* from the root of the project and save it as *config.json*. You should proceed to fill this out. *REGION* should be set to the AWS region you wish to deploy to. Similarly *STAGE* should be set to the AWS environment you wish to deploy to, this is typically *dev* or *prod*. You should create a [Github access token](https://github.com/settings/tokens) with access to the *repo* scope and enter it as *GITHUB_OATH_TOKEN*. *GITHUB_WEBHOOK_SECRET* can be any alphanumeric string, this value will be used when configuring the webhook on Github. *API_KEY* likewise should be any alphanumeric string, this is used to authenticate client GET requests to the */commits* endpoint. An example of a *config.json* file is shown below.
``` json
{
  "REGION": "eu-west-1",
  "STAGE": "dev",
  "TABLE_NAME": "github-wc-example",
  "GITHUB_OATH_TOKEN": "ac0298feec90fb9f273x933abe1b436bc3bb70b5",
  "GITHUB_WEBHOOK_SECRET": "V5X0=+5beJTlD0Y",
  "API_KEY": "4ez0ee1b436bc90fc7f273c598f94abec8bb70b5"
}
```

### Deploying to AWS
Follow the instructions on the [Serverless](https://serverless.com/framework/docs/providers/aws/guide/installation) website to install Node.js, Serverless and setup your AWS credentials. Afterwards in the terminal from the project folder run *npm install* to get the dependencies and *serverless deploy* to deploy to AWS. Make a note of the URLs that are created on API Gateway.

### Setting up the webhook
Go to the repository *settings* tab on Github, select *webhooks* from the left hand panel and then click the *add webhook* button. *Payload URL* should be the */webhook* API Gateway endpoint created in the previous section. Copy and paste the follow URL here. *Content type* should be set to *application/json* and secret should be set to the same value as *GITHUB_WEBHOOK_SECRET* in *config.json*. We want *just the push event* to trigger the webhook and the *active* checkbox to be ticked. The webhook should be now be configured and new pushes to the repository will trigger commit counts.

