'use strict'

const crypto = require('crypto')

const moment = require('moment')

const config = require('../config.json')
const dynamodb = require('../lib/dynamodb')
const github = require('../lib/github')
const response = require('../lib/response')

module.exports.handle = (event, context, callback) => {
  authenticate(event)
    .then(function () {
      let githubPayload = JSON.parse(event.body)
      let commits = getCommitsFromEvent(githubPayload)
      let repo = githubPayload.repository.full_name
      return github.get(commits, repo)
    })
    .then(function (responses) {
      return createSavePayloads(responses)
    })
    .then(function (payloads) {
      return dynamodb.save(payloads)
    })
    .then(function () {
      response.build(callback, 200, 'Word count webhook completed successfully')
    })
    .catch(function (error) {
      response.build(callback, error.statusCode || 500, error.message)
    })
}

function authenticate (event) {
  let hmac = crypto.createHmac('sha1', config.GITHUB_WEBHOOK_SECRET).update(event.body).digest('hex')
  if (`sha1=${hmac}` !== event.headers['X-Hub-Signature']) {
    return Promise.reject(response.error(401, 'Generated HMAC and X-Hub-Signature do not match'))
  }
  return Promise.resolve()
}

function getCommitsFromEvent (event) {
  return event.commits.reduce(function (list, commit) {
    list.push(commit.id)
    return list
  }, [])
}

function createSavePayloads (responses) {
  return Promise.resolve(responses.map(function (res) {
    return {
      timestamp: moment(res.commit.committer.date).format('x'),
      sha: res.sha,
      wordCount: countWordChangesInCommit(res.files)
    }
  }))
}

function countWordChangesInCommit (files) {
  return files.reduce(function (wordCount, file) {
    if ('patch' in file) {
      let fileChangeCount = countWordChangesInFilePatch(file.patch)
      wordCount.deleted += fileChangeCount.deleted
      wordCount.added += fileChangeCount.added
    }
    return wordCount
  }, {deleted: 0, added: 0})
}

function countWordChangesInFilePatch (patch) {
  let deletedWords = []
  let addedWords = []
  return patch.split('\n').reduce(function (wordCount, line) {
    switch (line.charAt(0)) {
      case '-':
        deletedWords = deletedWords.concat(getWordsInString(line))
        break
      case '+':
        addedWords = addedWords.concat(getWordsInString(line))
        let countResult = getWordChanges(deletedWords, addedWords)
        wordCount.deleted += countResult.deleted
        wordCount.added += countResult.added
        break
    }
    if (line.charAt(0) !== '-') {
      deletedWords = []
      addedWords = []
    }
    return wordCount
  }, {deleted: 0, added: 0})
}

function getWordsInString (str) {
  let regex = /[a-zA-Z0-9_\u0392-\u03c9\u0400-\u04FF]+|[\u4E00-\u9FFF\u3400-\u4dbf\uf900-\ufaff\u3040-\u309f\uac00-\ud7af\u0400-\u04FF]+|[\u00E4\u00C4\u00E5\u00C5\u00F6\u00D6]+|\w+/g
  return str.match(regex) || []
}

function getWordChanges (deletedWords, addedWords) {
  let deletedWordCount = getWordCount(deletedWords)
  let addedWordCount = getWordCount(addedWords)
  return {
    deleted: countChange(addedWordCount, deletedWordCount),
    added: countChange(deletedWordCount, addedWordCount)
  }
}

function getWordCount (arr) {
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
