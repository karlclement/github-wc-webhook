'use strict'

const crypto = require('crypto')

const aws = require('aws-sdk')
const request = require('request')
const requestPromise = require('request-promise')
const moment = require('moment')

const config = require('../config.json')

module.exports.handle = (event, context, callback) => {
  if (isAuthenticated(event, callback)) {
    let githubPushEvent = JSON.parse(event.body)
    let commits = getCommitsFromEvent(githubPushEvent)
    let promises = buildApiPromisesFromCommits(commits, githubPushEvent.repository.full_name)
    Promise.all(promises).then(function (responses) {
      let commitWordCount = {deleted: 0, added: 0}
      for (let response of responses) {
        for (let file of response.files) {
          if ('patch' in file) {
            let fileChangeCount = countWordChangesInFilePatch(file.patch)
            commitWordCount.deleted += fileChangeCount.deleted
            commitWordCount.added += fileChangeCount.added
          }
        }
        let timestamp = moment(response.commit.committer.date).format('x')
        return saveCommitCountToDatabase(timestamp, response.sha, commitWordCount)
      }
    }).catch(function (error) {
      callback(new Error(error))
    })
  }
}

function isAuthenticated (event, callback) {
  let hmac = crypto.createHmac('sha1', config.GITHUB_WEBHOOK_SECRET).update(event.body).digest('hex')
  if (`sha1=${hmac}` !== event.headers['X-Hub-Signature']) {
    callback(new Error('Generated HMAC and X-Hub-Signature do not match'))
    return false
  }
  return true
}

function getCommitsFromEvent (event) {
  return event.commits.reduce(function (list, commit) {
    list.push(commit.id)
    return list
  }, [])
}

function buildApiPromisesFromCommits (commits, path) {
  return commits.map(function (sha) {
    let url = `https://api.github.com/repos/${path}/commits/${sha}`
    let options = {
      json: true,
      uri: url,
      headers: {
        'Authorization': 'token ' + config.GITHUB_OATH_TOKEN,
        'User-Agent': 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:15.0) Gecko/20100101 Firefox/15.0.1'
      }
    }
    return requestPromise(options)
  })
}

function countWordChangesInFilePatch (patch) {
  let results = {deleted: 0, added: 0}
  let lines = patch.split('\n')
  let deletedWords = []
  let addedWords = []
  for (let line of lines) {
    switch (line.charAt(0)) {
      case '-':
        deletedWords = deletedWords.concat(getWordsInString(line))
        break
      case '+':
        addedWords = addedWords.concat(getWordsInString(line))
        let countResult = getMultiLineCountResult(deletedWords, addedWords)
        results.deleted += countResult.deleted
        results.added += countResult.added
        break
    }
    if (line.charAt(0) !== '-') {
      deletedWords = []
      addedWords = []
    }
  }
  return results
}

function getWordsInString (str) {
  let regex = /[a-zA-Z0-9_\u0392-\u03c9\u0400-\u04FF]+|[\u4E00-\u9FFF\u3400-\u4dbf\uf900-\ufaff\u3040-\u309f\uac00-\ud7af\u0400-\u04FF]+|[\u00E4\u00C4\u00E5\u00C5\u00F6\u00D6]+|\w+/g
  return str.match(regex) || []
}

function getMultiLineCountResult (deletedWords, addedWords) {
  let deletedWordCount = getWordCountFromList(deletedWords)
  let addedWordCount = getWordCountFromList(addedWords)
  return {
    deleted: countChange(addedWordCount, deletedWordCount),
    added: countChange(deletedWordCount, addedWordCount)
  }
}

function getWordCountFromList (arr) {
  return arr.reduce(function (obj, word) {
    if (word in obj) {
      obj[word]++
    } else {
      obj[word] = 1
    }
    return obj
  }, {})
}

function countChange (wordCountObjOne, wordCountObjTwo) {
  let count = 0
  for (let word in wordCountObjTwo) {
    if (word in wordCountObjOne) {
      let change = wordCountObjTwo[word] - wordCountObjOne[word]
      count += change > 0 ? change : 0
    } else {
      count += wordCountObjTwo[word]
    }
  }
  return count
}

function saveCommitCountToDatabase (timestamp, sha, wordCount) {
  let docClient = new aws.DynamoDB.DocumentClient()
  let payload = {timestamp, sha, wordCount}
  return docClient.put({TableName: config.TABLE_NAME, Item: payload}).promise()
}
