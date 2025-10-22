import {
  checkCallbacks,
  registerVoters,
  registerVoting,
  registerVote,
  retrieveVotingSummary,
} from '../dist/index.js'
import { users } from './common.mjs'

const votersResponse = await registerVoters({
  users: users,
})
console.group('Voters:')
console.dir(votersResponse, { depth: null })
console.groupEnd()

const { voters } = votersResponse
const [firstVoter, ...otherVoters] = voters
const { voterId: startedBy } = firstVoter

const votingResponse = await registerVoting({
  votingParams: {
    votingDescription: {
      'en-US': 'What should we name the new product?',
      'pt-BR': 'Como devemos nomear o novo produto?',
    },
    votingType: 'option',
    startedBy,
    endsAt: (() => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      return tomorrow
    })(),
    options: ['Alpha', 'Beta', 'Gamma', 'Delta'],
    onlyOneSelected: true,
  },
})
const { voting: votingData } = votingResponse
console.group('Voting:')
console.dir(votingResponse, { depth: null })
console.groupEnd()

const { votingId } = votingData

const voteResponse = await registerVote({
  voteParams: {
    votingId,
    voterId: startedBy,
    choices: [
      {
        value: 'Alpha',
      },
    ],
  },
})

console.group('Vote:')
console.dir(voteResponse, { depth: null })
console.groupEnd()

const votingSummaryResponse = await retrieveVotingSummary({
  votingId,
})

console.group('Voting Summary:')
console.dir(votingSummaryResponse, { depth: null })
console.groupEnd()

console.log('Checking callbacks', await checkCallbacks())
