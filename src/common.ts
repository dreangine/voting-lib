import { randomUUID } from 'crypto'

import {
  VoteId,
  VoterId,
  VotingId,
  Callbacks,
  VotingData,
  CandidateStatsElection,
  CandidateStatsJudgment,
  VotingType,
  CandidateStats,
  PersistResponse,
  RetrieveResponse,
  VoteData,
  VotesStats,
  UserId,
  VoterData,
  VoterActive,
} from './types'

// Defaults
export const DEFAULT_CANDIDATE_STATS_ELECTION: CandidateStatsElection = Object.freeze({
  elect: 0,
  pass: 0,
})
export const DEFAULT_CANDIDATE_STATS_JUDGMENT: CandidateStatsJudgment = Object.freeze({
  guilty: 0,
  innocent: 0,
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
  hasVoted: () => Promise.reject(new Error('Not implemented: hasVoted')),
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

export function isCandidateBasedVotingType(votingType: VotingType): boolean {
  return ['election', 'judgment'].includes(votingType)
}

export function isOptionBasedVotingType(votingType: VotingType): boolean {
  return ['open', 'selection'].includes(votingType)
}

export function persistVoting(voting: VotingData): Promise<PersistResponse> {
  try {
    return CALLBACKS.persistVoting(voting)
  } catch (error) {
    return Promise.reject(`Thrown error: ${error.message}`)
  }
}

export function persistVoters(voters: VoterData[]): Promise<PersistResponse> {
  try {
    return CALLBACKS.persistVoters(voters)
  } catch (error) {
    return Promise.reject(`Thrown error: ${error.message}`)
  }
}

export function persistVote(vote: VoteData): Promise<PersistResponse> {
  try {
    return CALLBACKS.persistVote(vote)
  } catch (error) {
    return Promise.reject(`Thrown error: ${error.message}`)
  }
}

export function retrieveVoting(votingId: VotingId): Promise<RetrieveResponse<VotingData>> {
  try {
    return CALLBACKS.retrieveVoting(votingId)
  } catch (error) {
    return Promise.reject(`Thrown error: ${error.message}`)
  }
}

export function retrieveVoter(userId: UserId): Promise<RetrieveResponse<VoterData>> {
  try {
    return CALLBACKS.retrieveVoter(userId)
  } catch (error) {
    return Promise.reject(`Thrown error: ${error.message}`)
  }
}

export function retrieveVotes(
  votingId: VotingId
): Promise<RetrieveResponse<VoteData[] | VotesStats>> {
  try {
    return CALLBACKS.retrieveVotes(votingId)
  } catch (error) {
    return Promise.reject(`Thrown error: ${error.message}`)
  }
}

export function checkActiveVoters(votersIds: VoterId[]): Promise<VoterActive> {
  try {
    return CALLBACKS.checkActiveVoters(votersIds)
  } catch (error) {
    return Promise.reject(`Thrown error: ${error.message}`)
  }
}

export function countActiveVoters(): Promise<number> {
  try {
    return CALLBACKS.countActiveVoters()
  } catch (error) {
    return Promise.reject(`Thrown error: ${error.message}`)
  }
}

export function hasVoted(voterId: VoterId, votingId: VotingId): Promise<boolean> {
  try {
    return CALLBACKS.hasVoted(voterId, votingId)
  } catch (error) {
    return Promise.reject(`Thrown error: ${error.message}`)
  }
}

export function setCallbacks(newCallbacks: Partial<Callbacks>) {
  Object.assign(CALLBACKS, newCallbacks)
}

export async function checkCallbacks(): Promise<{ [functionName: string]: boolean }> {
  return Promise.allSettled(
    Object.entries(CALLBACKS).map(([name, callback]) => {
      return Promise.resolve({ [name]: callback !== DEFAULT_CALLBACKS[name] })
    })
  ).then((results) => {
    return results.reduce((acc, result) => {
      return {
        ...acc,
        ...(result as PromiseFulfilledResult<{ [functionName: string]: boolean }>).value,
      }
    }, {})
  })
}

export function generateVotingId(): VotingId {
  return `voting-${randomUUID()}`
}

export function generateVoterId(): VoterId {
  return `voter-${randomUUID()}`
}

export function generateVoteId(): VoteId {
  return `vote-${randomUUID()}`
}

export function getDefaultStats(votingType: VotingType): CandidateStats {
  return votingType === 'election'
    ? DEFAULT_CANDIDATE_STATS_ELECTION
    : DEFAULT_CANDIDATE_STATS_JUDGMENT
}

export function hasVotingEnded(voting: VotingData): boolean {
  return voting.endsAt < new Date()
}
