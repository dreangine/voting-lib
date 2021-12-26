import { expect } from 'chai'
import * as chai from 'chai'
import * as spies from 'chai-spies'
import * as chaiPromised from 'chai-as-promised'

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
chai.use(chaiPromised)

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

describe('Start a voting', () => {
  describe('Election', () => {
    const votingType = 'election'
    it('should start an election', async () => {
      const spy = chai.spy(() => Promise.resolve())
      const request: StartVotingRequest = {
        persistVoting: spy,
        votingParams: {
          votingDescription: {
            'en-US': 'Test voting',
          },
          votingType,
          startedBy: 'V1ASDF',
          candidates: ['V2ASDF', 'V3ASDF'],
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

    it('an election cannot be started by a candidate', async () => {
      const spy = chai.spy(() => Promise.resolve())
      const request: StartVotingRequest = {
        persistVoting: spy,
        votingParams: {
          votingDescription: {
            'en-US': 'Test election',
          },
          votingType,
          startedBy: 'V1ASDF',
          candidates: ['V1ASDF'],
          endsAt: new Date(),
        },
      }

      await expect(startVoting(request)).to.be.rejectedWith(
        'Voting cannot be started by a candidate'
      )
    })
  })

  describe('Judgement', () => {
    const votingType = 'judgement'
    it('should start a judgement', async () => {
      const spy = chai.spy(() => Promise.resolve())
      const request: StartVotingRequest = {
        persistVoting: spy,
        votingParams: {
          votingDescription: {
            'en-US': 'Test judgement',
          },
          votingType,
          startedBy: 'V1ASDF',
          candidates: ['V2ASDF', 'V3ASDF'],
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

    it('an election cannot be started by a candidate', async () => {
      const spy = chai.spy(() => Promise.resolve())
      const request: StartVotingRequest = {
        persistVoting: spy,
        votingParams: {
          votingDescription: {
            'en-US': 'Test judgement',
          },
          votingType,
          startedBy: 'V1ASDF',
          candidates: ['V1ASDF'],
          endsAt: new Date(),
        },
      }

      await expect(startVoting(request)).to.be.rejectedWith(
        'Voting cannot be started by a candidate'
      )
    })
  })
})

describe('Add a vote', () => {
  describe('Election', () => {
    const veredict = 'elect'
    it('should add a vote', async () => {
      const spy = chai.spy(() => Promise.resolve())
      const request: RegisterVoteRequest = {
        persistVote: spy,
        voteParams: {
          votingId: 'V1ASDF',
          voterId: 'V1ASDF',
          choices: [
            {
              candidateId: 'V2ASDF',
              veredict,
            },
          ],
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
          choices: [
            {
              candidateId: 'V2ASDF',
              veredict,
            },
          ],
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

    it('cannot vote on yourself', async () => {
      const request: RegisterVoteRequest = {
        persistVote: () => Promise.resolve(),
        voteParams: {
          votingId: 'V1ASDF',
          voterId: 'V1ASDF',
          choices: [
            {
              candidateId: 'V1ASDF',
              veredict,
            },
          ],
        },
      }

      await expect(registerVote(request)).to.be.rejectedWith('Voter cannot vote for themselves')
    })
  })

  describe('Judgement', () => {
    it('should add a vote', async () => {
      const spy = chai.spy(() => Promise.resolve())
      const request: RegisterVoteRequest = {
        persistVote: spy,
        voteParams: {
          votingId: 'V1ASDF',
          voterId: 'V1ASDF',
          choices: [
            {
              candidateId: 'V2ASDF',
              veredict: 'guilty',
            },
          ],
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
          choices: [
            {
              candidateId: 'V2ASDF',
              veredict: 'guilty',
            },
          ],
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

    it('cannot vote for yourself', async () => {
      const request: RegisterVoteRequest = {
        persistVote: () => Promise.resolve(),
        voteParams: {
          votingId: 'V1ASDF',
          voterId: 'V1ASDF',
          choices: [
            {
              candidateId: 'V1ASDF',
              veredict: 'innocent',
            },
          ],
        },
      }

      await expect(registerVote(request)).to.be.rejectedWith('Voter cannot vote for themselves')
    })
  })
})

describe('Retrieve voting summary', () => {
  it('should retrieve voting summary - ongoing voting', async () => {
    const votingId = generateVotingId()
    const votesDistribution = [
      ['V1ASDF', 'guilty'],
      ['V1ASDF', 'guilty'],
      ['V1ASDF', 'innocent'],
      ['V2ASDF', 'guilty'],
      ['V2ASDF', 'innocent'],
    ]
    const candidates = [...new Set(votesDistribution.map(([csandidateId]) => csandidateId))]
    const votes = votesDistribution.map(
      ([candidateId, vote]) =>
        ({
          voteId: generateVoteId(),
          votingId,
          voterId: generateVoterId(),
          choices: [
            {
              candidateId,
              veredict: vote,
            },
          ],
          candidateId: candidateId,
          createdAt: new Date(),
        } as VoteData)
    )
    const tomorrowDate = new Date(Date.now() + 24 * 60 * 60 * 1000)
    const retrieveVotingSpy = chai.spy(() =>
      Promise.resolve({
        votingId,
        votingDescription: {
          'en-US': 'Test voting',
        },
        votingType: 'judgement',
        startsAt: new Date(),
        endsAt: tomorrowDate,
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
        candidatesStats[candidateId] = { guilty: 0, innocent: 0, elect: 0 }
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
    expect(result.votingSummaryState).to.equal('partial')
  })

  it('should retrieve voting summary - ended voting', async () => {
    const votingId = generateVotingId()
    const votesDistribution = [
      ['V1ASDF', 'guilty'],
      ['V1ASDF', 'guilty'],
      ['V1ASDF', 'innocent'],
      ['V2ASDF', 'guilty'],
      ['V2ASDF', 'innocent'],
    ]
    const candidates = [...new Set(votesDistribution.map(([csandidateId]) => csandidateId))]
    const votes = votesDistribution.map(
      ([candidateId, vote]) =>
        ({
          voteId: generateVoteId(),
          votingId,
          voterId: generateVoterId(),
          choices: [
            {
              candidateId,
              veredict: vote,
            },
          ],
          candidateId: candidateId,
          createdAt: new Date(),
        } as VoteData)
    )
    const yesterdayDate = new Date(Date.now() - 1000 * 60 * 60 * 24)
    const retrieveVotingSpy = chai.spy(() =>
      Promise.resolve({
        votingId,
        votingDescription: {
          'en-US': 'Test voting',
        },
        votingType: 'judgement',
        startsAt: new Date(),
        endsAt: yesterdayDate,
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
        candidatesStats[candidateId] = { guilty: 0, innocent: 0, elect: 0 }
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
    expect(result.votingSummaryState).to.equal('final')
  })
})
