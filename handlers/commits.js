'use strict'

const aws = require('aws-sdk')

const config = require('../config.json')

module.exports.handle = (event, context, callback) => {
  if (isAuthenticated(event, callback)) {
    let params = Object.assign({}, event.queryStringParameters)
    queryDatabase(params).then(function (response) {
      let message = response.Count + ' commits returned'
      callback(null, buildResponse(200, message, response.Items))
    }).catch(function (error) {
      console.error(error)
      callback(null, buildResponse(500, 'An error occured, check CloudWatch logs for more information'))
    })
  }
}

function isAuthenticated (event, callback) {
  if (!('X-Authorization' in event.headers)) {
    callback(null, buildResponse(401, 'Please pass a valid API Key as a X-Authorization header'))
    return false
  }
  if (event.headers['X-Authorization'] !== config.API_KEY) {
    callback(null, buildResponse(401, 'API Key not valid'))
    return false
  }
  return true
}

function queryDatabase (params) {
  let docClient = new aws.DynamoDB.DocumentClient()
  return docClient.scan(buildQuery(params)).promise()
}

function buildQuery (params) {
  let query = {TableName: config.TABLE_NAME}
  if (hasValidLimitParameter(params)) query.Limit = params.limit
  return query
}

function hasValidLimitParameter (params) {
  return (
    'limit' in params &&
    params.limit % 1 === 0 &&
    params.limit > 0
  )
}

function buildResponse (statusCode, message, commits) {
  let responseBody = {message}
  if (commits) responseBody.commits = commits
  return {
    statusCode: statusCode,
    body: JSON.stringify(responseBody)
  }
}
