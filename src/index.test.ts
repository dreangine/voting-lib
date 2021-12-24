import { expect } from 'chai'
import * as chai from 'chai'
import * as spies from 'chai-spies'

import {
  RegisterVoteByUserIdParams,
  RegisterVoteParams,
  RegisterVotersParams,
  RetrieveVotingSummaryParams,
  StartVotingParams,
  CandidatesStats,
  Vote,
  Voter,
  Voting,
} from './types'

import {
  generateVoteId,
  generateVoterId,
  generateVotingId,
  registerVote,
  registerVoteByUserId,
  registerVoters,
  retrieveVotingSummary,
  startVoting,
} from './index'

chai.use(spies)

describe('Add voters', () => {
  it('should add voters', async () => {
    const spy = chai.spy(() => Promise.resolve())
    const registerVotersParams: RegisterVotersParams = {
      persistVoters: spy,
      userIds: ['U1ASDF', 'U2ASDF'],
    }
    const result = await registerVoters(registerVotersParams)

    expect(spy).to.have.been.called.once
    expect(spy).to.have.been.called.with(result)
    expect(result).to.exist
    result &&
      result.forEach((voter) => {
        expect(voter.voterId).to.exist
      })
  })
  it('should add voters - omit data', async () => {
    const spy = chai.spy(() => Promise.resolve())
    const registerVotersParams: RegisterVotersParams = {
      persistVoters: spy,
      userIds: ['U1ASDF', 'U2ASDF'],
      omitReturnedData: true,
    }
    const result = await registerVoters(registerVotersParams)

    expect(spy).to.have.been.called.once
    expect(result).to.be.null
  })
})

describe('Start election', () => {
  it('should start an election', async () => {
    const spy = chai.spy(() => Promise.resolve())
    const startVotingParams: StartVotingParams = {
      persistVoting: spy,
      votingParams: {
        votingDescriptionId: 'VD1ASDF',
        startedBy: 'V1ASDF',
        candidates: ['V1ASDF', 'V2ASDF'],
        endsAt: new Date(),
      },
    }

    const result = await startVoting(startVotingParams)

    expect(spy).to.have.been.called.once
    expect(spy).to.have.been.called.with(result)
    expect(result.votingId).to.exist
    expect(result.startedAt).to.exist
  })
})

describe('Add a vote', () => {
  it('should add a vote', async () => {
    const spy = chai.spy(() => Promise.resolve())
    const registerVoteParams: RegisterVoteParams = {
      persistVote: spy,
      voteParams: {
        votingId: 'V1ASDF',
        voterId: 'V1ASDF',
        choice: 'yes',
        candidateId: 'V2ASDF',
      },
    }

    const result = await registerVote(registerVoteParams)

    expect(spy).to.have.been.called.once
    expect(spy).to.have.been.called.with(result)
    expect(result.voteId).to.exist
    expect(result.createdAt).to.exist
  })

  it('should add a vote - by userId', async () => {
    const spyPersist = chai.spy(() => Promise.resolve())
    const voter: Voter = { voterId: 'V1ASDF', userId: 'U1ASDF' }
    const spyRetrieve = chai.spy(() => Promise.resolve(voter))
    const registerVoteParams: RegisterVoteByUserIdParams = {
      persistVote: spyPersist,
      retrieveVoter: spyRetrieve,
      voteParams: {
        userId: 'U1ASDF',
        votingId: 'V1ASDF',
        choice: 'yes',
        candidateId: 'V2ASDF',
      },
    }

    const result = await registerVoteByUserId(registerVoteParams)

    expect(spyPersist).to.have.been.called.once
    expect(spyPersist).to.have.been.called.with(result)
    expect(spyRetrieve).to.have.been.called.once
    expect(result.voterId).to.equal(voter.voterId)
    expect(result.voteId).to.exist
    expect(result.createdAt).to.exist
  })
})

describe('Retrieve voting summary', () => {
  it('should retrieve voting summary', async () => {
    const votingId = generateVotingId()
    const votesDistribution = [
      ['V1ASDF', 'yes'],
      ['V1ASDF', 'yes'],
      ['V1ASDF', 'no'],
      ['V2ASDF', 'yes'],
      ['V2ASDF', 'no'],
    ]
    const candidates = votesDistribution
      .map(([csandidateId]) => csandidateId)
      .filter((item, pos, self) => self.indexOf(item) === pos)
    const votes = votesDistribution.map(
      ([candidateId, vote]) =>
        ({
          voteId: generateVoteId(),
          votingId,
          voterId: generateVoterId(),
          choice: vote,
          candidateId: candidateId,
          createdAt: new Date(),
        } as Vote)
    )
    const retrieveVotingSpy = chai.spy(() =>
      Promise.resolve({
        votingId,
        votingDescriptionId: 'VD1ASDF',
        startedAt: new Date(),
        endsAt: new Date(),
        candidates: candidates,
        startedBy: generateVoterId(),
      } as Voting)
    )
    const retrieveVotesSpy = chai.spy(() => Promise.resolve(votes))
    const retrieveVotingSummaryParams: RetrieveVotingSummaryParams = {
      retrieveVoting: retrieveVotingSpy,
      retrieveVotes: retrieveVotesSpy,
      votingId: 'V1ASDF',
    }

    const result = await retrieveVotingSummary(retrieveVotingSummaryParams)
    const expectedStats = votesDistribution.reduce((candidatesStats, vote) => {
      const [candidateId, choice] = vote
      if (!candidatesStats[candidateId]) {
        candidatesStats[candidateId] = { yes: 0, no: 0 }
      }
      candidatesStats[candidateId][choice]++
      return candidatesStats
    }, {} as CandidatesStats)
    expect(retrieveVotingSpy).to.have.been.called.once
    expect(retrieveVotingSpy).to.have.been.called.with('V1ASDF')
    expect(retrieveVotesSpy).to.have.been.called.once
    expect(retrieveVotesSpy).to.have.been.called.with('V1ASDF')
    expect(result).to.exist
    expect(result.candidatesStats).to.deep.equal(expectedStats)
  })
})
