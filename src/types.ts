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

export type Evidence = {
  type: EvidenceType
  data: string // the actual text or an image URL
}

export type VeredictElection = 'elect' | 'pass'
export type VeredictJudgment = 'innocent' | 'guilty'
export type Veredict = VeredictElection | VeredictJudgment

export type VeredictFinalBase = 'undecided'
export type VeredictFinalElection = 'elected' | 'not elected' | VeredictFinalBase
export type VeredictFinalJudgment = 'innocent' | 'guilty' | VeredictFinalBase
export type VeredictFinal = VeredictFinalElection | VeredictFinalJudgment
export type VeredictPartial = VeredictFinal | 'pending'

export type VotingType = 'election' | 'judgment'

export type VoteChoice = {
  candidateId: VoterId
  veredict: Veredict
}

export type CandidateStatsElection = {
  [veredict in VeredictElection]: number
}

export type CandidateStatsJudgment = {
  [veredict in VeredictJudgment]: number
}

export type CandidateStats = CandidateStatsElection | CandidateStatsJudgment

export type VotesStats = {
  [candidateId: VoterId]: Partial<CandidateStats>
}

export type CandidatesStats = {
  [candidateId: VoterId]: CandidateStats
}

export type PartialVeredict = {
  candidateId: VoterId
  veredict: VeredictPartial
  electVotes?: number
}

export type FinalVeredictStatsElection = {
  [candidateId: VoterId]: VeredictFinalElection
}

export type FinalVeredictStatsJudgment = {
  [candidateId: VoterId]: VeredictFinalJudgment
}

export type FinalVeredictStats = FinalVeredictStatsElection | FinalVeredictStatsJudgment

export type VotingSummaryState = 'partial' | 'final'

export type VotingDescription = {
  [language: string]: string
}

export type VoterStatus = 'active' | 'inactive'

// Anyone can see how the voter voted but its user information isn't public
export type Voter = {
  voterId: VoterId
  userId: UserId
  alias?: string
  status: VoterStatus
}

export type CandidateInfo = {
  candidateId: VoterId
  alias?: string
  speech?: string
}

export type VotingBase = {
  votingId: VotingId
  votingDescription: VotingDescription
  votingType: VotingType
  startedBy: VoterId
  candidates: CandidateInfo[]
  startsAt: Date
  endsAt: Date
  totalVoters: number
  requiredParticipationPercentage?: number
}

export type Election = VotingBase & {
  maxElectedCandidates: number
}

export type Judgment = VotingBase & {
  evidences: Evidence[]
}

export type Voting = Election | Judgment

export type Vote = {
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

type BasicData = {
  createdAt: Date
  updatedAt: Date
}

export type VoterData = Voter & BasicData

export type VotingData = Voting & BasicData

export type VoteData = Vote & Omit<BasicData, 'updatedAt'>

/**
 * PARAMS
 */

export type VotingParams = {
  votingDescription: VotingDescription
  votingType: VotingType
  startedBy: VoterId
  candidates: CandidateInfo[]
  startsAt?: Date
  endsAt: Date
  requiredParticipationPercentage?: number
}

export type ElectionParams = VotingParams & {
  maxElectedCandidates: number
}

export type JudgmentParams = VotingParams & {
  evidences: Evidence[]
}

export type VotingParamsValidate = Omit<Voting, 'votingId' | 'totalVoters'>

export type VoteParams = Omit<Vote, 'voteId'>

export type VoteParamsValidate = VoteParams

/**
 * REQUESTS
 */

export type RegisterVotingRequest = {
  votingParams: ElectionParams | JudgmentParams
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

export type RegisterVotingResponse = {
  voting: VotingData
}

export type RegisterVotersResponse = {
  voters?: VoterData[]
}

export type RegisterVoteResponse = {
  vote: VoteData
}

export type RetrieveVotingSummaryResponse = {
  voting: VotingData
  candidatesStats: CandidatesStats
  votingSummaryState: VotingSummaryState
  finalVeredict?: FinalVeredictStatsElection | FinalVeredictStatsJudgment
}
