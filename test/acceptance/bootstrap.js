const chai = require('chai')
chai.should()

chai.use(require('chai-as-promised'))
chai.use(require('chaid'))

// Do not truncate assertion errors
chai.config.truncateThreshold = 0
