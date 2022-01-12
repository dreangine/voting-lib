import { nanoid } from 'nanoid/async'

import {
  RegisterVoteByUserIdRequest,
  RegisterVoteRequest,
  RegisterVotersRequest,
  RetrieveVotingSummaryRequest,
  CandidatesStats,
  VoteId,
  VoterId,
  VotingId,
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
  RegisterVotingRequest,
  RegisterVotingResponse,
} from './types'

// Defaults
export const DEFAULT_CANDIDATE_STATS: CandidateStats = Object.freeze({
  guilty: 0,
  innocent: 0,
  elect: 0,
  pass: 0,
})
export const DEFAULT_MIN_VOTING_DURATION = 1000 * 60 * 5 // 5 minutes
export const DEFAULT_MAX_VOTING_DURATION = 1000 * 60 * 60 * 24 * 7 // 1 week
export const DEFAULT_MIN_CANDIDATES_ELECTION = 2
export const DEFAULT_CALLBACKS: Callbacks = Object.freeze({
  persistVoting: () => Promise.reject(new Error('Not implemented: persistVoting')),
  persistVoters: () => Promise.reject(new Error('Not implemented: persistVoters')),
  persistVote: () => Promise.reject(new Error('Not implemented: persistVote')),
  retrieveVoting: () => Promise.reject(new Error('Not implemented: retrieveVoting')),
  retrieveVoter: () => Promise.reject(new Error('Not implemented: retrieveVoter')),
  retrieveVotes: () => Promise.reject(new Error('Not implemented: retrieveVotes')),
  checkActiveVoters: () => Promise.reject(new Error('Not implemented: checkActiveVoters')),
  countActiveVoters: () => Promise.reject(new Error('Not implemented: countActiveVoters')),
})

// Setup
export const MIN_VOTING_DURATION: number = +(
  process.env.MIN_VOTING_DURATION ?? DEFAULT_MIN_VOTING_DURATION
)
export const MAX_VOTING_DURATION: number = +(
  process.env.MAX_VOTING_DURATION ?? DEFAULT_MAX_VOTING_DURATION
)
export const MIN_CANDIDATES_ELECTION: number = +(
  process.env.MIN_CANDIDATES_ELECTION ?? DEFAULT_MIN_CANDIDATES_ELECTION
)
const CALLBACKS: Callbacks = {
  ...DEFAULT_CALLBACKS,
}

export function setCallbacks(newCallbacks: Partial<Callbacks>) {
  Object.assign(CALLBACKS, newCallbacks)
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
            ...DEFAULT_CANDIDATE_STATS,
          }
          candidatesStats[candidateId][veredict]++
        })
        return candidatesStats
      }, {} as CandidatesStats)
    : Object.entries(votesData as VotesStats).reduce(
        (candidatesStats, [candidateId, { guilty = 0, innocent = 0, elect = 0, pass = 0 }]) => {
          candidatesStats[candidateId] = candidatesStats[candidateId] || {
            ...DEFAULT_CANDIDATE_STATS,
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

export async function registerVoting(
  request: RegisterVotingRequest
): Promise<RegisterVotingResponse> {
  const now = new Date()
  const { votingParams } = request
  const { startedBy, candidates, startsAt = now, endsAt, votingType } = votingParams

  // Validate
  if (endsAt < startsAt) throw new Error('Voting cannot end before it starts')
  const timeDiff = endsAt.getTime() - startsAt.getTime()
  if (timeDiff < MIN_VOTING_DURATION) throw new Error('Voting duration is too short')
  if (timeDiff > MAX_VOTING_DURATION) throw new Error('Voting duration is too long')
  if (candidates.length < MIN_CANDIDATES_ELECTION && votingType === 'election')
    throw new Error(`Election must have at least ${MIN_CANDIDATES_ELECTION} candidates`)
  if (candidates.includes(startedBy)) throw new Error('Voting cannot be started by a candidate')
  const allVoters = [startedBy, ...candidates]
  const checkedVoters = await CALLBACKS.checkActiveVoters(allVoters)
  const notFoundVoterIds = allVoters.filter((candidate) => !checkedVoters[candidate])
  if (notFoundVoterIds.length) throw new Error(`Voters ${notFoundVoterIds.join(', ')} do not exist`)

  // Get the total amount of active voters when voting starts
  const totalVoters = await CALLBACKS.countActiveVoters()

  const voting: VotingData = {
    ...votingParams,
    startsAt,
    votingId: await generateVotingId(),
    totalVoters,
    createdAt: now,
    updatedAt: now,
  }
  await CALLBACKS.persistVoting(voting)
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
  await CALLBACKS.persistVoters(voters)
  return { voters: omitReturnedData ? undefined : voters }
}

export async function registerVote(request: RegisterVoteRequest): Promise<RegisterVoteResponse> {
  const { voteParams } = request
  const now = new Date()
  const { votingId, voterId, choices } = voteParams

  // Validate
  const candidates = choices.map((choice) => choice.candidateId)
  if (candidates.includes(voterId)) throw new Error('Voter cannot vote for themselves')
  const { data: voting } = await CALLBACKS.retrieveVoting(votingId)
  if (!voting) throw new Error('Voting does not exist')
  if (hasVotingEnded(voting)) throw new Error('Voting has ended')

  const vote: VoteData = {
    ...voteParams,
    voteId: await generateVoteId(),
    createdAt: now,
  }
  await CALLBACKS.persistVote(vote)
  return { vote }
}

export async function registerVoteByUserId(
  request: RegisterVoteByUserIdRequest
): Promise<RegisterVoteResponse> {
  const { voteParams } = request
  const { data: voter } = await CALLBACKS.retrieveVoter(voteParams.userId)

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
    CALLBACKS.retrieveVoting(votingId),
    CALLBACKS.retrieveVotes(votingId),
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
      candidatesStats[candidateId] = { ...DEFAULT_CANDIDATE_STATS }
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
