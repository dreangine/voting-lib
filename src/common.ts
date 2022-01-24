import { nanoid } from 'nanoid/async'

import {
  VoteId,
  VoterId,
  VotingId,
  Callbacks,
  VotingData,
  CandidateStatsElection,
  CandidateStatsJudgement,
  VotingType,
  CandidateStats,
} from './types'

// Defaults
export const DEFAULT_CANDIDATE_STATS_ELECTION: CandidateStatsElection = Object.freeze({
  elect: 0,
  pass: 0,
})
export const DEFAULT_CANDIDATE_STATS_JUDGEMENT: CandidateStatsJudgement = Object.freeze({
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

export async function generateVotingId(): Promise<VotingId> {
  return `voting-${await nanoid()}`
}

export async function generateVoterId(): Promise<VoterId> {
  return `voter-${await nanoid()}`
}

export async function generateVoteId(): Promise<VoteId> {
  return `vote-${await nanoid()}`
}

export function getDefaultStats(votingType: VotingType): CandidateStats {
  return votingType === 'election'
    ? DEFAULT_CANDIDATE_STATS_ELECTION
    : DEFAULT_CANDIDATE_STATS_JUDGEMENT
}

export function hasVotingEnded(voting: VotingData): boolean {
  return voting.endsAt < new Date()
}
