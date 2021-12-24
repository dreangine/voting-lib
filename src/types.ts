export type UserId = string // private ID of the voter (links to the user database)
export type VoterId = string // public ID of the voter
export type VotingId = string
export type VotingDescriptionId = string
export type VoteId = string

/**
 * Anyone can see how the voter voted but its user information isn't public
 */
export type Voter = {
  voterId: VoterId
  userId: UserId
}

export type EvidenceType = 'text' | 'image'

export type Evidence = {
  type: EvidenceType
  data: string // the actual text or an image URL
}

export type Voting = {
  votingId: VotingId
  votingDescriptionId: VotingDescriptionId
  startedBy: VoterId
  candidates: VoterId[]
  startedAt: Date
  endsAt: Date
  evidence?: Evidence
}

export type VotingParams = Omit<Voting, 'votingId' | 'startedAt'>

export type VoteChoice = 'yes' | 'no'

export type Vote = {
  voteId: VoteId
  votingId: VotingId
  voterId: VoterId
  choice: VoteChoice
  candidateId: VoterId
  createdAt: Date
}

export type VoteParams = Omit<Vote, 'voteId' | 'createdAt'>

export type CandidatesStats = {
  [candidateId: VoterId]: {
    yes: number
    no: number
  }
}

export type VotingSummary = {
  voting: Voting
  candidatesStats: CandidatesStats
}

export type StartVotingParams = {
  persistVoting: (voting: Voting) => Promise<void>
  votingParams: VotingParams
}

export type RegisterVotersParams = {
  persistVoters: (voters: Voter[]) => Promise<void>
  userIds: UserId[]
  omitReturnedData?: boolean
}

export type RegisterVoteParams = {
  persistVote: (vote: Vote) => Promise<void>
  voteParams: VoteParams
}

export type RegisterVoteByUserIdParams = {
  persistVote: (vote: Vote) => Promise<void>
  retrieveVoter: (userId: UserId) => Promise<Voter>
  voteParams: { userId: UserId } & Omit<VoteParams, 'voterId'>
}

export type RetrieveVotingSummaryParams = {
  retrieveVoting: (votingId: VotingId) => Promise<Voting>
  retrieveVotes: (votingId: VotingId) => Promise<Vote[]>
  votingId: VotingId
}
