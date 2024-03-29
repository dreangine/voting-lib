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
  Helpers,
  VoteChoice,
  VoteChoiceCandidateBased,
  CandidateVotingData,
  OptionVotingData,
  VotingParams,
  CandidateBasedVotingParams,
  Options,
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
const DEFAULT_STATS = Object.freeze({
  ['election']: DEFAULT_CANDIDATE_STATS_ELECTION,
  ['judgment']: DEFAULT_CANDIDATE_STATS_JUDGMENT,
})
export const DEFAULT_MIN_VOTING_DURATION = 1000 * 60 * 5 // 5 minutes
export const DEFAULT_MAX_VOTING_DURATION = 1000 * 60 * 60 * 24 * 7 // 1 week
export const DEFAULT_MIN_CANDIDATES_ELECTION = 2
export const DEFAULT_CAN_VOTER_VOTE_FOR_HIMSELF = false
export const DEFAULT_CAN_CANDIDATE_START_VOTING = false
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
export const DEFAULT_HELPERS: Helpers = Object.freeze({
  getCurrentDate: () => new Date(),
  generateRandomUUID: () => randomUUID(),
})

// Setup
export const OPTIONS: Options = Object.seal({
  minVotingDuration: DEFAULT_MIN_VOTING_DURATION,
  maxVotingDuration: DEFAULT_MAX_VOTING_DURATION,
  minCandidatesElection: DEFAULT_MIN_CANDIDATES_ELECTION,
  canVoterVoteForHimself: DEFAULT_CAN_VOTER_VOTE_FOR_HIMSELF,
  canCandidateStartVoting: DEFAULT_CAN_CANDIDATE_START_VOTING,
})
const CALLBACKS: Callbacks = Object.seal({
  ...DEFAULT_CALLBACKS,
})

const HELPERS: Helpers = Object.seal({
  ...DEFAULT_HELPERS,
})

export function isCandidateBasedVotingType(votingType: VotingType): boolean {
  return ['election', 'judgment'].includes(votingType)
}

export function isOptionBasedVotingType(votingType: VotingType): boolean {
  return ['option'].includes(votingType)
}

export function isCandidateBasedVoting(voting: VotingData): voting is CandidateVotingData {
  return isCandidateBasedVotingType(voting.votingType)
}

export function isOptionBasedVoting(voting: VotingData): voting is OptionVotingData {
  return isOptionBasedVotingType(voting.votingType)
}

export function isCandidateBasedVotingParams(
  votingParams: VotingParams
): votingParams is CandidateBasedVotingParams {
  return isCandidateBasedVotingType(votingParams.votingType)
}

export function isCandidateBasedVoteChoice(
  voteChoice: VoteChoice
): voteChoice is VoteChoiceCandidateBased {
  return (voteChoice as VoteChoiceCandidateBased).candidateId !== undefined
}

export function isCandidateStatsElection(stats: VotesStats): stats is CandidateStatsElection {
  return (stats as CandidateStatsElection).elect !== undefined
}

export function isCandidateStatsJudgment(stats: VotesStats): stats is CandidateStatsJudgment {
  return (stats as CandidateStatsJudgment).guilty !== undefined
}

export function isOptionStats(stats: VotesStats): boolean {
  return Number.isInteger(stats)
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

export function setCallbacks(newCallbacks: Partial<Callbacks>): void {
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

export function setHelpers(newHelpers: Partial<Helpers>): void {
  Object.assign(HELPERS, newHelpers)
}

function generateRandomUUID(): string {
  return HELPERS.generateRandomUUID()
}

export function generateVotingId(): VotingId {
  return `voting-${generateRandomUUID()}`
}

export function generateVoterId(): VoterId {
  return `voter-${generateRandomUUID()}`
}

export function generateVoteId(): VoteId {
  return `vote-${generateRandomUUID()}`
}

export function getDefaultStats(votingType: VotingType): CandidateStats {
  return DEFAULT_STATS[votingType]
}

export function hasVotingEnded(voting: VotingData): boolean {
  return voting.endsAt < HELPERS.getCurrentDate()
}
