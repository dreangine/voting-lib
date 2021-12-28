export type UserId = string // private ID of the voter (links to the user database)
export type VoterId = string // public ID of the voter
export type VotingId = string
export type VoteId = string

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

export type CandidatesStats = {
  [candidateId: VoterId]: {
    guilty: number
    innocent: number
    elect: number
    pass: number
  }
}

export type FinalVeredictStats = {
  [candidateId: VoterId]: VeredictFinal
}

export type VotingSummaryState = 'partial' | 'final'

export type VotingDescription = {
  [language: string]: string
}

// Anyone can see how the voter voted but its user information isn't public
export type Voter = {
  voterId: VoterId
  userId: UserId
}

export type Voting = {
  votingId: VotingId
  votingDescription: VotingDescription
  votingType: VotingType
  startedBy: VoterId
  candidates: VoterId[]
  startsAt: Date
  endsAt: Date
  evidence?: Evidence
}

export type Vote = {
  voteId: VoteId
  votingId: VotingId
  voterId: VoterId
  choices: VoteChoice[]
}

export type Callbacks = {
  persistVoting: (voting: VotingData) => Promise<void>
  persistVoters: (voters: VoterData[]) => Promise<void>
  persistVote: (vote: VoteData) => Promise<void>
  retrieveVoting: (votingId: VotingId) => Promise<VotingData | null>
  retrieveVoter: (userId: UserId) => Promise<VoterData | null>
  retrieveVotes: (votingId: VotingId) => Promise<VoteData[] | null>
  checkVoters: (votersIds: VoterId[]) => Promise<{
    [voterId: VoterId]: boolean
  }>
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

export type VotingParams = Partial<Pick<Voting, 'startsAt'>> & Omit<Voting, 'votingId' | 'startsAt'>

export type VoteParams = Omit<Vote, 'voteId'>

/**
 * REQUESTS
 */

export type StartVotingRequest = {
  votingParams: VotingParams
}

export type RegisterVotersRequest = {
  userIds: UserId[]
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

export type StartVotingResponse = {
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
