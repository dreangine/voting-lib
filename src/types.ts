export type UserId = string // private ID of the voter (links to the user database)
export type VoterId = string // public ID of the voter
export type VotingId = string
export type VoteId = string

export type UserInfo = {
  userId: UserId
  alias?: string
}

export type EvidenceType = 'text' | 'image'

export type Evidence = {
  type: EvidenceType
  data: string // the actual text or an image URL
}

export type Veredict = 'elect' | 'pass' | 'innocent' | 'guilty'

export type VeredictFinal = 'elected' | 'not elected' | 'innocent' | 'guilty' | 'undecided'

export type VotingType = 'election' | 'judgement'

export type VoteChoice = {
  candidateId: VoterId
  veredict: Veredict
}

export type CandidateStats = {
  [veredict in Veredict]: number
}

export type VotesStats = {
  [candidateId: VoterId]: Partial<CandidateStats>
}

export type CandidatesStats = {
  [candidateId: VoterId]: CandidateStats
}

export type FinalVeredictStats = {
  [candidateId: VoterId]: VeredictFinal
}

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

export type Voting = {
  votingId: VotingId
  votingDescription: VotingDescription
  votingType: VotingType
  startedBy: VoterId
  candidates: VoterId[]
  startsAt: Date
  endsAt: Date
  totalVoters: number
  requiredParticipationPercentage?: number
  evidences?: Evidence[]
}

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

export type VotingParams = Partial<Pick<Voting, 'startsAt'>> &
  Omit<Voting, 'votingId' | 'startsAt' | 'totalVoters'>

export type VotingParamsValidate = Omit<Voting, 'votingId' | 'totalVoters'>

export type VoteParams = Omit<Vote, 'voteId'>

export type VoteParamsValidate = VoteParams

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
  finalVeredict?: FinalVeredictStats
}
