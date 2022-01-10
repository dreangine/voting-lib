import { nanoid } from 'nanoid/async'

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
  FinalVeredictStats,
  Callbacks,
  VoteData,
  VoterData,
  VotesStats,
  CandidateStats,
} from './types'

export const defaultCandidateStats: CandidateStats = Object.freeze({
  guilty: 0,
  innocent: 0,
  elect: 0,
  pass: 0,
})

const callbacks: Callbacks = {
  persistVoting: () => Promise.reject(new Error('Not implemented')),
  persistVoters: () => Promise.reject(new Error('Not implemented')),
  persistVote: () => Promise.reject(new Error('Not implemented')),
  retrieveVoting: () => Promise.reject(new Error('Not implemented')),
  retrieveVoter: () => Promise.reject(new Error('Not implemented')),
  retrieveVotes: () => Promise.reject(new Error('Not implemented')),
  checkActiveVoters: () => Promise.reject(new Error('Not implemented')),
  countActiveVoters: () => Promise.reject(new Error('Not implemented')),
}

export function setCallbacks(newCallbacks: Partial<Callbacks>) {
  Object.assign(callbacks, newCallbacks)
}

export async function generateVotingId(): Promise<VotingId> {
  return `voting-${await nanoid()}`
}

export async function generateVoterId(): Promise<VoterId> {
  return `voter-${await nanoid()}`
}

export async function generateVoteId(): Promise<VoteId> {
  return `vote-${await nanoid()}`
}

export function hasVotingEnded(voting: VotingData): boolean {
  return voting.endsAt < new Date()
}

export function generateVotesStats(votesData?: VoteData[] | VotesStats | null): CandidatesStats {
  if (!votesData) return {}
  return votesData instanceof Array
    ? (votesData as VoteData[]).reduce((candidatesStats, { choices }) => {
        choices.forEach(({ candidateId, veredict }) => {
          candidatesStats[candidateId] = candidatesStats[candidateId] || {
            ...defaultCandidateStats,
          }
          candidatesStats[candidateId][veredict]++
        })
        return candidatesStats
      }, {} as CandidatesStats)
    : Object.entries(votesData as VotesStats).reduce(
        (candidatesStats, [candidateId, { guilty = 0, innocent = 0, elect = 0, pass = 0 }]) => {
          candidatesStats[candidateId] = candidatesStats[candidateId] || {
            ...defaultCandidateStats,
          }
          candidatesStats[candidateId].guilty += guilty
          candidatesStats[candidateId].innocent += innocent
          candidatesStats[candidateId].elect += elect
          candidatesStats[candidateId].pass += pass
          return candidatesStats
        },
        {} as CandidatesStats
      )
}

export function generateFinalVeredict(candidatesStats: CandidatesStats): FinalVeredictStats {
  return Object.entries(candidatesStats).reduce(
    (finalVeredict, [candidateId, { guilty, innocent, elect, pass }]) => {
      if (guilty > innocent) {
        finalVeredict[candidateId] = 'guilty'
      } else if (innocent > guilty) {
        finalVeredict[candidateId] = 'innocent'
      } else if (elect > pass) {
        finalVeredict[candidateId] = 'elected'
      } else if (pass > elect) {
        finalVeredict[candidateId] = 'not elected'
      } else {
        finalVeredict[candidateId] = 'undecided'
      }
      return finalVeredict
    },
    {} as FinalVeredictStats
  )
}

export async function startVoting(request: StartVotingRequest): Promise<StartVotingResponse> {
  const { votingParams } = request
  const { startedBy, candidates } = votingParams
  const now = new Date()

  // Validate
  if (candidates.includes(startedBy)) throw new Error('Voting cannot be started by a candidate')
  const allVoters = [startedBy, ...candidates]
  const checkedVoters = await callbacks.checkActiveVoters(allVoters)
  const notFoundVoterIds = allVoters.filter((candidate) => !checkedVoters[candidate])
  if (notFoundVoterIds.length) throw new Error(`Voters ${notFoundVoterIds.join(', ')} do not exist`)

  // Get the total amount of active voters when voting starts
  const totalVoters = await callbacks.countActiveVoters()

  const voting: VotingData = {
    startsAt: now,
    ...votingParams,
    votingId: await generateVotingId(),
    totalVoters,
    createdAt: now,
    updatedAt: now,
  }
  await callbacks.persistVoting(voting)
  return { voting }
}

export async function registerVoters(
  request: RegisterVotersRequest
): Promise<RegisterVotersResponse> {
  const { userIds, omitReturnedData } = request
  const now = new Date()
  const voters = await Promise.all(
    userIds.map(
      async (userId) =>
        ({
          voterId: await generateVoterId(),
          userId,
          status: 'active',
          createdAt: now,
          updatedAt: now,
        } as VoterData)
    )
  )
  await callbacks.persistVoters(voters)
  return { voters: omitReturnedData ? undefined : voters }
}

export async function registerVote(request: RegisterVoteRequest): Promise<RegisterVoteResponse> {
  const { voteParams } = request
  const now = new Date()
  const { votingId, voterId, choices } = voteParams

  // Validate
  const candidates = choices.map((choice) => choice.candidateId)
  if (candidates.includes(voterId)) throw new Error('Voter cannot vote for themselves')
  const { data: voting } = await callbacks.retrieveVoting(votingId)
  if (!voting) throw new Error('Voting does not exist')
  if (hasVotingEnded(voting)) throw new Error('Voting has ended')

  const vote: VoteData = {
    ...voteParams,
    voteId: await generateVoteId(),
    createdAt: now,
  }
  await callbacks.persistVote(vote)
  return { vote }
}

export async function registerVoteByUserId(
  request: RegisterVoteByUserIdRequest
): Promise<RegisterVoteResponse> {
  const { voteParams } = request
  const { data: voter } = await callbacks.retrieveVoter(voteParams.userId)

  // Validate
  if (!voter) throw new Error('Voter not registered')

  const { voterId } = voter
  return registerVote({
    voteParams: {
      voterId,
      ...voteParams,
    },
  })
}

export async function retrieveVotingSummary(
  request: RetrieveVotingSummaryRequest
): Promise<RetrieveVotingSummaryResponse> {
  const { votingId } = request
  return Promise.allSettled([
    callbacks.retrieveVoting(votingId),
    callbacks.retrieveVotes(votingId),
  ]).then((results) => {
    const [votingResult, votesResult] = results
    if (votingResult.status === 'rejected') {
      throw new Error(`Unable to retrieve voting: ${votingResult.reason}`)
    }
    if (votesResult.status === 'rejected') {
      throw new Error(`Unable to retrieve votes: ${votesResult.reason}`)
    }

    const { data: voting } = votingResult.value
    const { data: votes } = votesResult.value

    if (!voting) throw new Error('Voting not found')

    const baseStats: CandidatesStats = voting.candidates.reduce((candidatesStats, candidateId) => {
      candidatesStats[candidateId] = { ...defaultCandidateStats }
      return candidatesStats
    }, {} as CandidatesStats)
    const candidatesStats = { ...baseStats, ...generateVotesStats(votes) }
    const isVotingFinal = hasVotingEnded(voting)
    const votingSummaryState: VotingSummaryState = isVotingFinal ? 'final' : 'partial'

    const finalVeredict = isVotingFinal && generateFinalVeredict(candidatesStats)

    const response = {
      voting,
      candidatesStats,
      votingSummaryState,
      ...(finalVeredict && { finalVeredict }),
    }
    return response
  })
}
