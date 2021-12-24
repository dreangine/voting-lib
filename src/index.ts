import { nanoid } from 'nanoid'

import {
  RegisterVoteByUserIdParams,
  RegisterVoteParams,
  RegisterVotersParams,
  RetrieveVotingSummaryParams,
  StartVotingParams,
  TargetStats,
  Vote,
  VoteId,
  Voter,
  VoterId,
  Voting,
  VotingId,
  VotingSummary,
} from './types'

export function generateVotingId(): VotingId {
  return nanoid()
}

export function generateVoterId(): VoterId {
  return nanoid()
}

export function generateVoteId(): VoteId {
  return nanoid()
}

export async function startVoting(params: StartVotingParams): Promise<Voting> {
  const { persistVoting, votingParams } = params
  console.log('Voting params:', votingParams)
  const voting = {
    ...votingParams,
    votingId: generateVotingId(),
    startedAt: new Date(),
  }
  await persistVoting(voting)
  console.log('Voting started:', voting)
  return voting
}

export async function registerVoters(params: RegisterVotersParams): Promise<Voter[] | null> {
  const { persistVoters, userIds, omitReturnedData } = params
  const voters = userIds.map((userId) => ({ voterId: nanoid(), userId }))
  await persistVoters(voters)
  console.log('Voters registered:', voters)
  return omitReturnedData ? null : voters
}

export async function registerVote(params: RegisterVoteParams): Promise<Vote> {
  const { persistVote, voteParams } = params
  const vote = {
    ...voteParams,
    voteId: generateVoterId(),
    createdAt: new Date(),
  }
  await persistVote(vote)
  console.log('Vote registered:', vote)
  return vote
}

export async function registerVoteByUserId(params: RegisterVoteByUserIdParams): Promise<Vote> {
  const { persistVote, retrieveVoter, voteParams } = params
  const { voterId } = await retrieveVoter(voteParams.userId)
  return registerVote({
    persistVote,
    voteParams: {
      voterId,
      ...voteParams,
    },
  })
}

export async function retrieveVotingSummary(
  params: RetrieveVotingSummaryParams
): Promise<VotingSummary> {
  const { retrieveVoting, retrieveVotes, votingId } = params
  return Promise.allSettled([retrieveVoting(votingId), retrieveVotes(votingId)]).then((results) => {
    const [votingResult, votesResult] = results
    if (votingResult.status === 'rejected') {
      throw new Error(`Voting ${votingId} not found`)
    }
    if (votesResult.status === 'rejected') {
      throw new Error(`Votes for voting ${votingId} not found`)
    }
    const voting = votingResult.value
    const targetsStats = votesResult.value.reduce((targetsStats, vote) => {
      const { targetId, choice: voteType } = vote
      if (!targetsStats[targetId]) {
        targetsStats[targetId] = { yes: 0, no: 0 }
      }
      targetsStats[targetId][voteType]++
      return targetsStats
    }, {} as TargetStats)
    console.log('Voting summary:', { voting, targetsStats })
    return { voting, targetsStats }
  })
}
