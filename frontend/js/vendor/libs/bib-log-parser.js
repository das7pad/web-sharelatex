// Generated by CoffeeScript 1.10.0
define(function() {
  var BAD_CROSS_REFERENCE_REGEX, BibLogParser, LINE_SPLITTER_REGEX, MESSAGE_LEVELS, MULTILINE_COMMAND_ERROR_REGEX, MULTILINE_ERROR_REGEX, MULTILINE_WARNING_REGEX, SINGLELINE_WARNING_REGEX, consume, errorParsers, warningParsers;
  LINE_SPLITTER_REGEX = /^\[(\d+)].*>\s(INFO|WARN|ERROR)\s-\s(.*)$/;
  MESSAGE_LEVELS = {
    "INFO": "info",
    "WARN": "warning",
    "ERROR": "error"
  };
  BibLogParser = function(text, options) {
    if (typeof text !== 'string') {
      throw new Error("BibLogParser Error: text parameter must be a string");
    }
    this.text = text.replace(/(\r\n)|\r/g, '\n');
    this.options = options || {};
    this.lines = text.split('\n');
  };
  consume = function(logText, regex, process) {
    var iterationCount, match, newEntry, re, result, text;
    text = logText;
    result = [];
    re = regex;
    iterationCount = 0;
    while (match = re.exec(text)) {
      iterationCount += 1;
      newEntry = process(match);

      // Too many log entries can cause browser crashes
      // Construct a too many files error from the last match
      const maxErrors = 100
      if (iterationCount >= maxErrors) {
        const level = newEntry.level + "s"
        newEntry.message = `Over ${maxErrors} ${level} returned. Download raw logs to see full list`;
        newEntry.line = undefined;
        result.unshift(newEntry)
        return [result, ""];
      }

      result.push(newEntry);
      text = (match.input.slice(0, match.index)) + (match.input.slice(match.index + match[0].length + 1, match.input.length));
    }
    return [result, text];
  };
  MULTILINE_WARNING_REGEX = /^Warning--(.+)\n--line (\d+) of file (.+)$/m;
  SINGLELINE_WARNING_REGEX = /^Warning--(.+)$/m;
  MULTILINE_ERROR_REGEX = /^(.*)---line (\d+) of file (.*)\n([^]+?)\nI'm skipping whatever remains of this entry$/m;
  BAD_CROSS_REFERENCE_REGEX = /^(A bad cross reference---entry ".+?"\nrefers to entry.+?, which doesn't exist)$/m;
  MULTILINE_COMMAND_ERROR_REGEX = /^(.*)\n?---line (\d+) of file (.*)\n([^]+?)\nI'm skipping whatever remains of this command$/m;
  // Errors hit in BST file have a slightly different format
  BST_ERROR_REGEX = /^(.*?)\nwhile executing---line (\d+) of file (.*)/m;
  warningParsers = [
    [
      MULTILINE_WARNING_REGEX, function(match) {
        var fileName, fullMatch, lineNumber, message;
        fullMatch = match[0], message = match[1], lineNumber = match[2], fileName = match[3];
        return {
          file: fileName,
          level: "warning",
          message: message,
          line: lineNumber,
          raw: fullMatch
        };
      }
    ], [
      SINGLELINE_WARNING_REGEX, function(match) {
        var fullMatch, message;
        fullMatch = match[0], message = match[1];
        return {
          file: '',
          level: "warning",
          message: message,
          line: '',
          raw: fullMatch
        };
      }
    ]
  ];
  errorParsers = [
    [
      MULTILINE_ERROR_REGEX, function(match) {
        var fileName, firstMessage, fullMatch, lineNumber, secondMessage;
        fullMatch = match[0], firstMessage = match[1], lineNumber = match[2], fileName = match[3], secondMessage = match[4];
        return {
          file: fileName,
          level: "error",
          message: firstMessage + '\n' + secondMessage,
          line: lineNumber,
          raw: fullMatch
        };
      }
    ], [
      BAD_CROSS_REFERENCE_REGEX, function(match) {
        var fullMatch, message;
        fullMatch = match[0], message = match[1];
        return {
          file: '',
          level: "error",
          message: message,
          line: '',
          raw: fullMatch
        };
      }
    ], [
      MULTILINE_COMMAND_ERROR_REGEX, function(match) {
        var fileName, firstMessage, fullMatch, lineNumber, secondMessage;
        fullMatch = match[0], firstMessage = match[1], lineNumber = match[2], fileName = match[3], secondMessage = match[4];
        return {
          file: fileName,
          level: "error",
          message: firstMessage + '\n' + secondMessage,
          line: lineNumber,
          raw: fullMatch
        };
      }
    ],[
      BST_ERROR_REGEX, function(match) {
        var fileName, firstMessage, fullMatch, lineNumber, secondMessage;
        fullMatch = match[0], firstMessage = match[1], lineNumber = match[2], fileName = match[3];
        return {
          file: fileName,
          level: "error",
          message: firstMessage,
          line: lineNumber,
          raw: fullMatch
        };
      }
    ]
  ];

  (function() {
    this.parseBibtex = function() {
      var allErrors, allWarnings, ref, ref1, remainingText, result;
      result = {
        all: [],
        errors: [],
        warnings: [],
        files: [],
        typesetting: []
      };
      ref = warningParsers.reduce(function(accumulator, parser) {
        var _remainingText, currentWarnings, process, ref, regex, text, warnings;
        currentWarnings = accumulator[0], text = accumulator[1];
        regex = parser[0], process = parser[1];
        ref = consume(text, regex, process), warnings = ref[0], _remainingText = ref[1];
        return [currentWarnings.concat(warnings), _remainingText];
      }, [[], this.text]), allWarnings = ref[0], remainingText = ref[1];
      ref1 = errorParsers.reduce(function(accumulator, parser) {
        var _remainingText, currentErrors, errors, process, ref1, regex, text;
        currentErrors = accumulator[0], text = accumulator[1];
        regex = parser[0], process = parser[1];
        ref1 = consume(text, regex, process), errors = ref1[0], _remainingText = ref1[1];
        return [currentErrors.concat(errors), _remainingText];
      }, [[], remainingText]), allErrors = ref1[0], remainingText = ref1[1];
      result.warnings = allWarnings;
      result.errors = allErrors;
      result.all = allWarnings.concat(allErrors);
      return result;
    };
    this.parseBiber = function() {
      var result;
      result = {
        all: [],
        errors: [],
        warnings: [],
        files: [],
        typesetting: []
      };
      this.lines.forEach(function(line) {
        var _, fileName, fullLine, lineMatch, lineNumber, match, message, messageType, newEntry, realMessage;
        match = line.match(LINE_SPLITTER_REGEX);
        if (match) {
          fullLine = match[0], lineNumber = match[1], messageType = match[2], message = match[3];
          newEntry = {
            file: '',
            level: MESSAGE_LEVELS[messageType] || "INFO",
            message: message,
            line: '',
            raw: fullLine
          };
          lineMatch = newEntry.message.match(/^BibTeX subsystem: \/.+\/(\w+\.\w+)_.+, line (\d+), (.+)$/);
          if (lineMatch && lineMatch.length === 4) {
            _ = lineMatch[0], fileName = lineMatch[1], lineNumber = lineMatch[2], realMessage = lineMatch[3];
            newEntry.file = fileName;
            newEntry.line = lineNumber;
            newEntry.message = realMessage;
          }
          result.all.push(newEntry);
          switch (newEntry.level) {
            case 'error':
              return result.errors.push(newEntry);
            case 'warning':
              return result.warnings.push(newEntry);
          }
        }
      });
      return result;
    };
    return this.parse = function() {
      var firstLine;
      firstLine = this.lines[0];
      if (firstLine.match(/^.*INFO - This is Biber.*$/)) {
        return this.parseBiber();
      } else if (firstLine.match(/^This is BibTeX, Version.+$/)) {
        return this.parseBibtex();
      } else {
        throw new Error("BibLogParser Error: cannot determine whether text is biber or bibtex output");
      }
    };
  }).call(BibLogParser.prototype);
  BibLogParser.parse = function(text, options) {
    return new BibLogParser(text, options).parse();
  };
  return BibLogParser;
});
