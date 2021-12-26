import { nanoid } from 'nanoid'

import {
  RegisterVoteByUserIdRequest,
  RegisterVoteRequest,
  RegisterVotersRequest,
  RetrieveVotingSummaryRequest,
  StartVotingRequest,
  CandidatesStats,
  VoteId,
  VoterId,
  VotingId,
  StartVotingResponse,
  RegisterVotersResponse,
  RegisterVoteResponse,
  RetrieveVotingSummaryResponse,
  VotingData,
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

export async function startVoting(request: StartVotingRequest): Promise<StartVotingResponse> {
  const { persistVoting, votingParams } = request
  const { startedBy, candidates } = votingParams
  console.log('Voting params:', votingParams)
  const now = new Date()

  // Validate
  if (candidates.includes(startedBy)) throw new Error('Voting cannot be started by a candidate')

  const voting: VotingData = {
    startsAt: now,
    ...votingParams,
    votingId: generateVotingId(),
    createdAt: now,
    updatedAt: now,
  }
  await persistVoting(voting)
  console.log('Voting started:', voting)
  return { voting }
}

export async function registerVoters(
  request: RegisterVotersRequest
): Promise<RegisterVotersResponse> {
  const { persistVoters, userIds, omitReturnedData } = request
  const now = new Date()
  const voters = userIds.map((userId) => ({
    voterId: generateVoterId(),
    userId,
    createdAt: now,
    updatedAt: now,
  }))
  await persistVoters(voters)
  console.log('Voters registered:', voters)
  return { voters: omitReturnedData ? undefined : voters }
}

export async function registerVote(request: RegisterVoteRequest): Promise<RegisterVoteResponse> {
  const { persistVote, voteParams } = request
  const now = new Date()
  const vote = {
    ...voteParams,
    voteId: generateVoteId(),
    createdAt: now,
    updatedAt: now,
  }
  await persistVote(vote)
  console.log('Vote registered:', vote)
  return { vote }
}

export async function registerVoteByUserId(
  request: RegisterVoteByUserIdRequest
): Promise<RegisterVoteResponse> {
  const { persistVote, retrieveVoter, voteParams } = request
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
  request: RetrieveVotingSummaryRequest
): Promise<RetrieveVotingSummaryResponse> {
  const { retrieveVoting, retrieveVotes, votingId } = request
  return Promise.allSettled([retrieveVoting(votingId), retrieveVotes(votingId)]).then((results) => {
    const [votingResult, votesResult] = results
    if (votingResult.status === 'rejected') {
      throw new Error(`Voting ${votingId} not found`)
    }
    if (votesResult.status === 'rejected') {
      throw new Error(`Votes for voting ${votingId} not found`)
    }
    const voting = votingResult.value
    const candidatesStats = votesResult.value.reduce((candidatesStats, { choices }) => {
      choices.forEach(({ candidateId, veredict }) => {
        candidatesStats[candidateId] = candidatesStats[candidateId] || {
          guilty: 0,
          innocent: 0,
          elect: 0,
        }
        switch (veredict) {
          case 'guilty':
            candidatesStats[candidateId].guilty++
            break
          case 'innocent':
            candidatesStats[candidateId].innocent++
            break
          case 'elect':
            candidatesStats[candidateId].elect++
            break
        }
      })
      return candidatesStats
    }, {} as CandidatesStats)
    const response = { voting, candidatesStats }
    console.log('Voting summary:', response)
    return response
  })
}
