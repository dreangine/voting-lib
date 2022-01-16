import { setCallbacks } from '../dist/index.js'

export const users = [
  { userId: 'user1' },
  { userId: 'user2', alias: 'newcomer' },
  { userId: 'user3' },
]

const data = { voters: [], votings: [], votes: [] }

setCallbacks({
  persistVoters: async (voters) => {
    data.voters.push(...voters)
    return { inserts: 1 }
  },
  persistVoting: async (voting) => {
    data.votings.push(voting)
    return { inserts: 1 }
  },
  persistVote: async (vote) => {
    data.votes.push(vote)
    return { inserts: 1 }
  },
  retrieveVoting: async (votingId) => {
    const dbVoting = data.votings.find(({ votingId: dbVotingId }) => {
      return dbVotingId === votingId
    })

    return { data: dbVoting }
  },
  retrieveVotes: async (votingId) => {
    const dbVotes = data.votes.filter(({ votingId: dbVotingId }) => {
      return dbVotingId === votingId
    })
    return { data: dbVotes }
  },
  checkActiveVoters: async (voters) => {
    const votersFromDb = data.voters
      .filter((voter) => voter.status === 'active')
      .map((voter) => voter.voterId)
    const votersToCheck = voters.reduce((acc, voter) => {
      acc[voter] = votersFromDb.includes(voter)
      return acc
    }, {})
    return votersToCheck
  },
  countActiveVoters: async () => {
    return data.voters.length
  },
  hasVoted: async (voterId, votingId) => {
    const hasVoted = data.votes.some(
      (vote) => vote.voterId === voterId && vote.votingId === votingId
    )
    return hasVoted
  },
})
