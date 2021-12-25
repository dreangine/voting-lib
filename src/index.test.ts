import { expect } from 'chai'
import * as chai from 'chai'
import * as spies from 'chai-spies'

import {
  RegisterVoteByUserIdRequest,
  RegisterVoteRequest,
  RegisterVotersRequest,
  RetrieveVotingSummaryRequest,
  StartVotingRequest,
  CandidatesStats,
  VoteData,
  VoterData,
  VotingData,
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
    const request: RegisterVotersRequest = {
      persistVoters: spy,
      userIds: ['U1ASDF', 'U2ASDF'],
    }
    const response = await registerVoters(request)
    const { voters: responseVoters } = response

    expect(spy).to.have.been.called.once
    expect(spy).to.have.been.called.with(responseVoters)
    expect(responseVoters).to.exist
    responseVoters &&
      responseVoters.forEach((voter) => {
        expect(voter.voterId).to.exist
      })
  })
  it('should add voters - omit data', async () => {
    const spy = chai.spy(() => Promise.resolve())
    const request: RegisterVotersRequest = {
      persistVoters: spy,
      userIds: ['U1ASDF', 'U2ASDF'],
      omitReturnedData: true,
    }
    const response = await registerVoters(request)

    expect(spy).to.have.been.called.once
    expect(response.voters).to.be.undefined
  })
})

describe('Start election', () => {
  it('should start an election', async () => {
    const spy = chai.spy(() => Promise.resolve())
    const request: StartVotingRequest = {
      persistVoting: spy,
      votingParams: {
        votingDescription: {
          'en-US': 'Test voting',
        },
        startedBy: 'V1ASDF',
        candidates: ['V1ASDF', 'V2ASDF'],
        endsAt: new Date(),
      },
    }

    const response = await startVoting(request)
    const { voting: responseVoting } = response

    expect(spy).to.have.been.called.once
    expect(spy).to.have.been.called.with(responseVoting)
    expect(responseVoting.votingId).to.exist
    expect(responseVoting.startsAt).to.exist
  })
})

describe('Add a vote', () => {
  it('should add a vote', async () => {
    const spy = chai.spy(() => Promise.resolve())
    const request: RegisterVoteRequest = {
      persistVote: spy,
      voteParams: {
        votingId: 'V1ASDF',
        voterId: 'V1ASDF',
        choice: 'yes',
        candidateId: 'V2ASDF',
      },
    }

    const response = await registerVote(request)
    const { vote: responseVote } = response

    expect(spy).to.have.been.called.once
    expect(spy).to.have.been.called.with(responseVote)
    expect(responseVote.voteId).to.exist
    expect(responseVote.createdAt).to.exist
  })

  it('should add a vote - by userId', async () => {
    const spyPersist = chai.spy(() => Promise.resolve())
    const voter: VoterData = {
      voterId: 'V1ASDF',
      userId: 'U1ASDF',
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    const spyRetrieve = chai.spy(() => Promise.resolve(voter))
    const request: RegisterVoteByUserIdRequest = {
      persistVote: spyPersist,
      retrieveVoter: spyRetrieve,
      voteParams: {
        userId: 'U1ASDF',
        votingId: 'V1ASDF',
        choice: 'yes',
        candidateId: 'V2ASDF',
      },
    }

    const response = await registerVoteByUserId(request)
    const { vote: responseVote } = response

    expect(spyPersist).to.have.been.called.once
    expect(spyPersist).to.have.been.called.with(responseVote)
    expect(spyRetrieve).to.have.been.called.once
    expect(responseVote.voterId).to.equal(voter.voterId)
    expect(responseVote.voteId).to.exist
    expect(responseVote.createdAt).to.exist
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
    const candidates = [...new Set(votesDistribution.map(([csandidateId]) => csandidateId))]
    const votes = votesDistribution.map(
      ([candidateId, vote]) =>
        ({
          voteId: generateVoteId(),
          votingId,
          voterId: generateVoterId(),
          choice: vote,
          candidateId: candidateId,
          createdAt: new Date(),
        } as VoteData)
    )
    const retrieveVotingSpy = chai.spy(() =>
      Promise.resolve({
        votingId,
        votingDescription: {
          'en-US': 'Test voting',
        },
        startsAt: new Date(),
        endsAt: new Date(),
        candidates: candidates,
        startedBy: generateVoterId(),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as VotingData)
    )
    const retrieveVotesSpy = chai.spy(() => Promise.resolve(votes))
    const request: RetrieveVotingSummaryRequest = {
      retrieveVoting: retrieveVotingSpy,
      retrieveVotes: retrieveVotesSpy,
      votingId: 'V1ASDF',
    }

    const result = await retrieveVotingSummary(request)
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
