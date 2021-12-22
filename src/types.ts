/**
 * Anyone can see how the voter voted but its user information isn't public
 */
export type Voter = {
  // public ID of the voter
  voterId: string
  // private ID of the voter (links to the user database)
  userId: string
}

export type EvidenceType = 'text' | 'image'

export type Evidence = {
  type: EvidenceType
  // the actual text or an image URL
  data: string
}

export type Voting = {
  votingId: string
  votingDescriptionId: string
  startedBy: Voter
  targetedAt: Voter[]
  startedAt: Date
  endsAt: Date
  evidence?: Evidence
}

export type VoteType = 'yes' | 'no'

export type Vote = {
  voting: Voting
  voter: Voter
  vote: VoteType
  target: Voter
  createdAt: Date
}
