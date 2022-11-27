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
export type VerdictFinalOption = 'selected' | 'rejected' | VerdictFinalBase
export type VerdictFinal = VerdictFinalElection | VerdictFinalJudgment | VerdictFinalOption
export type VerdictPartial = VerdictFinal | 'pending elected' | 'pending selected'

export type CandidateBasedVotingType = 'election' | 'judgment'
export type OptionBasedVotingType = 'option'
export type VotingType = CandidateBasedVotingType | OptionBasedVotingType

export interface VoteChoiceCandidateBased {
  candidateId: VoterId
  verdict: Verdict
}

export interface VoteChoiceOptionBased {
  value: string
}

export type VoteChoice = VoteChoiceCandidateBased | VoteChoiceOptionBased

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

export type VotingStats = CandidatesStats | OptionsStats

export type PartialVerdict = {
  statsKey: VoterId | string
  verdict: VerdictPartial
  electVotes?: number
}

export type FinalVerdictStatsElection = {
  [candidateId: VoterId]: VerdictFinalElection
}

export type FinalVerdictStatsJudgment = {
  [candidateId: VoterId]: VerdictFinalJudgment
}

export type FinalVerdictStatsOption = {
  [option: string]: VerdictFinalOption
}

export type FinalVerdictStats =
  | FinalVerdictStatsElection
  | FinalVerdictStatsJudgment
  | FinalVerdictStatsOption

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
  requiredVotesPercentage?: number
  onlyOneSelected?: boolean
}

export interface CandidateBasedVoting extends VotingBase {
  candidates: CandidateInfo[]
}

export type Election = CandidateBasedVoting

export interface Judgment extends CandidateBasedVoting {
  evidences: Evidence[]
}

export interface OptionBasedVoting extends VotingBase {
  options?: string[]
}

export type Voting = Election | Judgment | OptionBasedVoting

export interface Vote {
  voteId: VoteId
  votingId: VotingId
  voterId: VoterId
  choices: VoteChoice[]
}

export type VoterActive = {
  [voterId: VoterId]: boolean
}

/**
 * OPTIONS
 */

export type Options = {
  minVotingDuration: number
  maxVotingDuration: number
  minCandidatesElection: number
}

/**
 * FUNCTIONS SETS
 */

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

export type Helpers = {
  getCurrentDate: () => Date
  generateRandomUUID: () => string
}

/**
 * DATA
 */

interface BasicData {
  createdAt: Date
  updatedAt: Date
}

export type VoterData = Voter & BasicData

export type CandidateVotingData = (Election | Judgment) & BasicData
export type OptionVotingData = OptionBasedVoting & BasicData
export type VotingData = CandidateVotingData | OptionVotingData

export type VoteData = Vote & Omit<BasicData, 'updatedAt'>

/**
 * PARAMS
 */

interface VotingParamsBase {
  votingDescription: VotingDescription
  votingType: VotingType
  startedBy: VoterId
  startsAt?: Date
  endsAt: Date
  requiredParticipationPercentage?: number
}

interface CandidateBasedVotingParamsBase extends VotingParamsBase {
  candidates: CandidateInfo[]
}

export interface ElectionParams extends CandidateBasedVotingParamsBase {
  onlyOneSelected: boolean
}

export interface JudgmentParams extends CandidateBasedVotingParamsBase {
  evidences: Evidence[]
}

export type CandidateBasedVotingParams = ElectionParams | JudgmentParams

export interface OptionBasedParams extends VotingParamsBase {
  options?: string[]
}

export type VotingParams = CandidateBasedVotingParams | OptionBasedParams

export type VotingParamsValidate = (CandidateBasedVotingParams | OptionBasedParams) & {
  startsAt: Date
}

export type VoteParams = Omit<Vote, 'voteId'>

/**
 * REQUESTS
 */

export type RegisterVotingRequest = {
  votingParams: VotingParams
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
  votingStats: VotingStats
  votingSummaryState: VotingSummaryState
  finalVerdict?: FinalVerdictStats
}
