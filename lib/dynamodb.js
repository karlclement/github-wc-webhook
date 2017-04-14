'use strict'

const aws = require('aws-sdk')
const docClient = new aws.DynamoDB.DocumentClient()

const config = require('../config.json')

module.exports.save = function (payloads) {
  return Promise.all(payloads.map(function (payload) {
    return docClient.put({TableName: config.TABLE_NAME, Item: payload}).promise()
  }))
}

module.exports.search = function (params) {
  let query = {TableName: config.TABLE_NAME}
  if (hasValidLimitParameter(params)) query.Limit = params.limit
  return docClient.scan(query).promise()
}

function hasValidLimitParameter (params) {
  return (
    'limit' in params &&
    params.limit % 1 === 0 &&
    params.limit > 0
  )
}
