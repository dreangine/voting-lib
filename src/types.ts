export type UserId = string // private ID of the voter (links to the user database)
export type VoterId = string // public ID of the voter
export type VotingId = string
export type VoteId = string

export type UserInfo =
  | {
      userId: UserId
      alias?: string
    }
  | {
      userId?: UserId
      alias: string
    }

export type EvidenceType = 'text' | 'image'

export interface Evidence {
  type: EvidenceType
  data: string // the actual text or an image URL
}

export type VerdictElection = 'elect' | 'pass'
export type VerdictJudgment = 'innocent' | 'guilty'
export type Verdict = VerdictElection | VerdictJudgment

type VerdictFinalBase = 'undecided'
export type VerdictFinalElection = 'elected' | 'not elected' | VerdictFinalBase
export type VerdictFinalJudgment = 'innocent' | 'guilty' | VerdictFinalBase
export type VerdictFinal = VerdictFinalElection | VerdictFinalJudgment
export type VerdictPartial = VerdictFinal | 'pending'

export type CandidateBasedVotingType = 'election' | 'judgment'
export type OptionBasedVotingType = 'open' | 'selection'
export type VotingType = CandidateBasedVotingType | OptionBasedVotingType

export interface VoteChoice {
  candidateId: VoterId
  verdict: Verdict
}

export type CandidateStatsElection = {
  [verdict in VerdictElection]: number
}

export type CandidateStatsJudgment = {
  [verdict in VerdictJudgment]: number
}

export type CandidateStats = CandidateStatsElection | CandidateStatsJudgment

export type CandidateBasedVotesStats = {
  [candidateId: VoterId]: Partial<CandidateStats>
}
export type VotesStats = CandidateBasedVotesStats | OptionsStats

export type CandidatesStats = {
  [candidateId: VoterId]: CandidateStats
}

export type OptionsStats = {
  [option: string]: number
}

export type PartialVerdict = {
  candidateId: VoterId
  verdict: VerdictPartial
  electVotes?: number
}

export type FinalVerdictStatsElection = {
  [candidateId: VoterId]: VerdictFinalElection
}

export type FinalVerdictStatsJudgment = {
  [candidateId: VoterId]: VerdictFinalJudgment
}

export type FinalVerdictStats = FinalVerdictStatsElection | FinalVerdictStatsJudgment

export type VotingSummaryState = 'partial' | 'final'

export type VotingDescription = {
  [language: string]: string
}

export type VoterStatus = 'active' | 'inactive'

// Anyone can see how the voter voted but its user information isn't public
export interface Voter {
  voterId: VoterId
  userId: UserId
  alias?: string
  status: VoterStatus
}

export interface CandidateInfo {
  candidateId: VoterId
  alias?: string
  speech?: string
}

interface VotingBase {
  votingId: VotingId
  votingDescription: VotingDescription
  votingType: VotingType
  startedBy: VoterId
  startsAt: Date
  endsAt: Date
  totalVoters: number
  requiredParticipationPercentage?: number
}

export interface CandidateBasedVoting extends VotingBase {
  candidates: CandidateInfo[]
}

export interface Election extends CandidateBasedVoting {
  maxElectedCandidates: number
}

export interface Judgment extends CandidateBasedVoting {
  evidences: Evidence[]
}

export type OpenVoting = VotingBase

export interface Selection extends VotingBase {
  options: string[]
}

export type Voting = Election | Judgment | OpenVoting | Selection

export interface Vote {
  voteId: VoteId
  votingId: VotingId
  voterId: VoterId
  choices: VoteChoice[]
}

export type VoterActive = {
  [voterId: VoterId]: boolean
}

export type Callbacks = {
  persistVoting: (voting: VotingData) => Promise<PersistResponse>
  persistVoters: (voters: VoterData[]) => Promise<PersistResponse>
  persistVote: (vote: VoteData) => Promise<PersistResponse>
  retrieveVoting: (votingId: VotingId) => Promise<RetrieveResponse<VotingData>>
  retrieveVoter: (userId: UserId) => Promise<RetrieveResponse<VoterData>>
  retrieveVotes: (votingId: VotingId) => Promise<RetrieveResponse<VoteData[] | VotesStats>>
  checkActiveVoters: (votersIds: VoterId[]) => Promise<VoterActive>
  countActiveVoters: () => Promise<number>
  hasVoted: (voterId: VoterId, votingId: VotingId) => Promise<boolean>
}

/**
 * DATA
 */

interface BasicData {
  createdAt: Date
  updatedAt: Date
}

export type VoterData = Voter & BasicData

export type VotingData = Voting & BasicData

export type VoteData = Vote & Omit<BasicData, 'updatedAt'>

/**
 * PARAMS
 */

interface VotingParams {
  votingDescription: VotingDescription
  votingType: VotingType
  startedBy: VoterId
  startsAt?: Date
  endsAt: Date
  requiredParticipationPercentage?: number
}

interface CandidateBasedVotingParams extends VotingParams {
  candidates: CandidateInfo[]
}

export interface ElectionParams extends CandidateBasedVotingParams {
  maxElectedCandidates: number
}

export interface JudgmentParams extends CandidateBasedVotingParams {
  evidences: Evidence[]
}

export type OpenVotingParams = VotingParams

export interface SelectionParams extends VotingParams {
  options: string[]
}

export type VotingParamsValidate = (
  | ElectionParams
  | JudgmentParams
  | OpenVotingParams
  | SelectionParams
) & {
  startsAt: Date
}

export type VoteParams = Omit<Vote, 'voteId'>

export type VoteParamsValidate = VoteParams

/**
 * REQUESTS
 */

export type RegisterVotingRequest = {
  votingParams: ElectionParams | JudgmentParams | OpenVotingParams | SelectionParams
}

export type RegisterVotersRequest = {
  users: UserInfo[]
  omitReturnedData?: boolean
}

export type RegisterVoteRequest = {
  voteParams: VoteParams
}

export type RegisterVoteByUserIdRequest = {
  voteParams: { userId: UserId } & Omit<VoteParams, 'voterId'>
}

export type RetrieveVotingSummaryRequest = {
  votingId: VotingId
}

/**
 * RESPONSES
 */

export type PersistResponse =
  | {
      inserts: number
    }
  | {
      updates: number
    }

export type RetrieveResponse<T> = {
  data: T | null
}

export interface RegisterVotingResponse {
  voting: VotingData
}

export interface RegisterVotersResponse {
  voters?: VoterData[]
}

export interface RegisterVoteResponse {
  vote: VoteData
}

export interface RetrieveVotingSummaryResponse {
  voting: VotingData
  votingStats: CandidatesStats | OptionsStats
  votingSummaryState: VotingSummaryState
  finalVerdict?: FinalVerdictStatsElection | FinalVerdictStatsJudgment
}
