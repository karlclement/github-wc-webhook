'use strict'

module.exports.handle = (event, context, callback) => {
  // let wordChangeResults = countWordChangesInPatch(patch)
}

function countWordChangesInPatch (patch) {
  let results = {
    deleted: 0,
    added: 0
  }
  let lines = patch.split('\n')
  let deletedWords = []
  let addedWords = []
  lines.forEach(function (line, i) {
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
  })
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
