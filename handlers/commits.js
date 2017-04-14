'use strict'

const aws = require('aws-sdk')

const config = require('../config.json')

module.exports.handle = (event, context, callback) => {
  queryDatabase(event).then(function (response) {
    let message = response.Count + ' commits returned'
    callback(null, buildResponse(200, message, response.Items))
  }).catch(function (error) {
    console.error(error)
    callback(null, buildResponse(500, 'An error occured, check CloudWatch logs for more information'))
  })
}

function queryDatabase (event) {
  let docClient = new aws.DynamoDB.DocumentClient()
  return docClient.scan(buildQuery(event)).promise()
}

function buildQuery (event) {
  let query = {TableName: config.TABLE_NAME}
  if (hasValidLimitParameter(event)) {
    query.limit = event.queryStringParameters.limit
  }
  return query
}

function hasValidLimitParameter (event) {
  return (
    'limit' in event.queryStringParameters &&
    event.queryStringParameters.limit % 1 === 0 &&
    event.queryStringParameters.limit > 0
  )
}

function buildResponse (statusCode, message, data) {
  let responseBody = {message}
  if (data) responseBody.data = data
  return {
    statusCode: statusCode,
    body: JSON.stringify(responseBody)
  }
}
