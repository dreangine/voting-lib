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
  VotingSummaryState,
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

export function hasVotingEnded(voting: VotingData): boolean {
  return voting.endsAt < new Date()
}

export async function startVoting(request: StartVotingRequest): Promise<StartVotingResponse> {
  const { persistVoting, votingParams } = request
  const { startedBy, candidates } = votingParams
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
  return { voters: omitReturnedData ? undefined : voters }
}

export async function registerVote(request: RegisterVoteRequest): Promise<RegisterVoteResponse> {
  const { persistVote, voteParams } = request
  const now = new Date()
  const { votingId, voterId, choices } = voteParams

  // Validate
  const candidates = choices.map((choice) => choice.candidateId)
  if (candidates.includes(voterId)) throw new Error('Voter cannot vote for themselves')

  // Check if voting has ended
  const voting = await request.retrieveVoting(votingId)
  if (hasVotingEnded(voting)) throw new Error('Voting has ended')

  const vote = {
    ...voteParams,
    voteId: generateVoteId(),
    createdAt: now,
    updatedAt: now,
  }
  await persistVote(vote)
  return { vote }
}

export async function registerVoteByUserId(
  request: RegisterVoteByUserIdRequest
): Promise<RegisterVoteResponse> {
  const { retrieveVoting, persistVote, retrieveVoter, voteParams } = request
  const { voterId } = await retrieveVoter(voteParams.userId)
  return registerVote({
    retrieveVoting,
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
    const votingSummaryState: VotingSummaryState = hasVotingEnded(voting) ? 'final' : 'partial'
    const response = { voting, candidatesStats, votingSummaryState }
    return response
  })
}
