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
  VoteChoice,
  VotingType,
  VoterId,
  UserId,
} from './types'

import {
  generateVoteId,
  generateVoterId,
  generateVotingId,
  registerVote,
  registerVoteByUserId,
  registerVoters,
  retrieveVotingSummary,
  setCallbacks,
  startVoting,
} from './index'

chai.use(spies)
chai.use(chaiPromised)

// Setup
const nowDate = new Date()
const yesterdayDate = new Date(nowDate.getTime() - 1000 * 60 * 60 * 24)
const tomorrowDate = new Date(nowDate.getTime() + 24 * 60 * 60 * 1000)

async function checkRegisterVoteByVoterId(
  voterId: VoterId,
  votingType: VotingType,
  candidates: VoterId[],
  choices: VoteChoice[]
) {
  const votingId = 'V1ASDF'
  const spyRetrieveVoting = chai.spy(() =>
    Promise.resolve({
      votingId,
      votingDescription: {
        'en-US': `Test voting (${votingType})`,
      },
      votingType,
      startsAt: yesterdayDate,
      endsAt: tomorrowDate,
      candidates,
      startedBy: generateVoterId(),
      createdAt: yesterdayDate,
      updatedAt: yesterdayDate,
    } as VotingData)
  )
  const spyPersist = chai.spy(() => Promise.resolve())

  setCallbacks({
    retrieveVoting: spyRetrieveVoting,
    persistVote: spyPersist,
  })

  const request: RegisterVoteRequest = {
    voteParams: {
      votingId,
      voterId,
      choices,
    },
  }

  const response = await registerVote(request)
  const { vote: responseVote } = response

  expect(spyRetrieveVoting).to.have.been.called.once
  expect(spyRetrieveVoting).to.have.been.called.with(votingId)
  expect(spyPersist).to.have.been.called.once
  expect(spyPersist).to.have.been.called.with(responseVote)
  expect(responseVote.voteId).to.exist
  expect(responseVote.createdAt).to.exist
}

async function checkRegisterVoteByUserId(
  userId: UserId,
  votingType: VotingType,
  candidates: VoterId[],
  choices: VoteChoice[]
) {
  const votingId = 'V1ASDF'
  const voterId = generateVoterId()
  const spyRetrieveVoting = chai.spy(() =>
    Promise.resolve({
      votingId,
      votingDescription: {
        'en-US': `Test voting (${votingType})`,
      },
      votingType,
      startsAt: yesterdayDate,
      endsAt: tomorrowDate,
      candidates,
      startedBy: generateVoterId(),
      createdAt: yesterdayDate,
      updatedAt: yesterdayDate,
    } as VotingData)
  )
  const spyPersistVote = chai.spy(() => Promise.resolve())
  const spyRetrieveVoter = chai.spy(() =>
    Promise.resolve({
      userId,
      voterId,
    } as VoterData)
  )

  setCallbacks({
    retrieveVoting: spyRetrieveVoting,
    persistVote: spyPersistVote,
    retrieveVoter: spyRetrieveVoter,
  })

  const request: RegisterVoteByUserIdRequest = {
    voteParams: {
      votingId,
      userId,
      choices,
    },
  }

  const response = await registerVoteByUserId(request)
  const { vote: responseVote } = response

  expect(spyRetrieveVoting).to.have.been.called.once
  expect(spyRetrieveVoting).to.have.been.called.with(votingId)
  expect(spyRetrieveVoter).to.have.been.called.once
  expect(spyRetrieveVoter).to.have.been.called.with(userId)
  expect(spyPersistVote).to.have.been.called.once
  expect(spyPersistVote).to.have.been.called.with(responseVote)
  expect(responseVote.voteId).to.exist
  expect(responseVote.voterId).to.equal(voterId)
  expect(responseVote.createdAt).to.exist
}

beforeEach(() => {
  setCallbacks({
    persistVote: () => Promise.resolve(),
    persistVoters: () => Promise.resolve(),
    persistVoting: () => Promise.resolve(),
    retrieveVoting: () => Promise.resolve(null),
    retrieveVoter: () => Promise.resolve(null),
    retrieveVotes: () => Promise.resolve(null),
  })
})

describe('Add voters', () => {
  it('should add voters', async () => {
    const spy = chai.spy(() => Promise.resolve())

    setCallbacks({
      persistVoters: spy,
    })

    const request: RegisterVotersRequest = {
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

    setCallbacks({
      persistVoters: spy,
    })

    const request: RegisterVotersRequest = {
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

      setCallbacks({
        persistVoting: spy,
      })

      const request: StartVotingRequest = {
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

      setCallbacks({
        persistVoting: spy,
      })

      const request: StartVotingRequest = {
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

      setCallbacks({
        persistVoting: spy,
      })

      const request: StartVotingRequest = {
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

      setCallbacks({
        persistVoting: spy,
      })

      const request: StartVotingRequest = {
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
    const votingType = 'election'
    it('should add a vote', async () => {
      await checkRegisterVoteByVoterId(
        'V1ASDF',
        votingType,
        ['V2ASDF', 'V3ASDF'],
        [
          {
            candidateId: 'V2ASDF',
            veredict,
          },
        ]
      )
    })

    it('should add a vote - by userId', async () => {
      await checkRegisterVoteByUserId(
        'U1ASDF',
        votingType,
        ['V2ASDF', 'V3ASDF'],
        [
          {
            candidateId: 'V2ASDF',
            veredict,
          },
        ]
      )
    })

    it('cannot vote on yourself', async () => {
      const spyRetrieveVoting = chai.spy(() => Promise.resolve({} as VotingData))
      const spyPersist = chai.spy(() => Promise.resolve())

      setCallbacks({
        retrieveVoting: spyRetrieveVoting,
        persistVote: spyPersist,
      })

      const request: RegisterVoteRequest = {
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
      expect(spyRetrieveVoting).to.not.have.been.called
      expect(spyPersist).to.not.have.been.called
    })

    it('cannot vote after voting has ended', async () => {
      const votingId = 'V1ASDF'
      const spyRetrieveVoting = chai.spy(() =>
        Promise.resolve({
          votingId,
          votingDescription: {
            'en-US': `Test voting (${votingType})`,
          },
          votingType,
          startsAt: yesterdayDate,
          endsAt: yesterdayDate,
          candidates: ['V2ASDF', 'V3ASDF'],
          startedBy: generateVoterId(),
          createdAt: yesterdayDate,
          updatedAt: yesterdayDate,
        } as VotingData)
      )
      const spyPersist = chai.spy(() => Promise.resolve())

      setCallbacks({
        retrieveVoting: spyRetrieveVoting,
        persistVote: spyPersist,
      })

      const request: RegisterVoteRequest = {
        voteParams: {
          votingId,
          voterId: 'V1ASDF',
          choices: [
            {
              candidateId: 'V2ASDF',
              veredict,
            },
          ],
        },
      }

      await expect(registerVote(request)).to.be.rejectedWith('Voting has ended')
      expect(spyRetrieveVoting).to.have.been.called.once
      expect(spyRetrieveVoting).to.have.been.called.with(votingId)
      expect(spyPersist).to.not.have.been.called
    })
  })

  describe('Judgement', () => {
    it('should add a vote', async () => {
      await checkRegisterVoteByVoterId(
        'V1ASDF',
        'judgement',
        ['V2ASDF', 'V3ASDF'],
        [
          {
            candidateId: 'V2ASDF',
            veredict: 'guilty',
          },
        ]
      )
    })

    it('should add a vote - by userId', async () => {
      await checkRegisterVoteByUserId(
        'U1ASDF',
        'judgement',
        ['V2ASDF', 'V3ASDF'],
        [
          {
            candidateId: 'V2ASDF',
            veredict: 'guilty',
          },
        ]
      )
    })

    it('cannot vote for yourself', async () => {
      const spyRetrieveVoting = chai.spy(() => Promise.resolve({} as VotingData))
      const spyPersist = chai.spy(() => Promise.resolve())

      setCallbacks({
        retrieveVoting: spyRetrieveVoting,
        persistVote: spyPersist,
      })

      const request: RegisterVoteRequest = {
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
      expect(spyRetrieveVoting).to.not.have.been.called
      expect(spyPersist).to.not.have.been.called
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

    setCallbacks({
      retrieveVoting: retrieveVotingSpy,
      retrieveVotes: retrieveVotesSpy,
    })

    const request: RetrieveVotingSummaryRequest = {
      votingId: 'V1ASDF',
    }

    const result = await retrieveVotingSummary(request)
    const expectedStats = votesDistribution.reduce((candidatesStats, vote) => {
      const [candidateId, choice] = vote
      if (!candidatesStats[candidateId]) {
        candidatesStats[candidateId] = { guilty: 0, innocent: 0, elect: 0, pass: 0 }
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

    setCallbacks({
      retrieveVoting: retrieveVotingSpy,
      retrieveVotes: retrieveVotesSpy,
    })

    const request: RetrieveVotingSummaryRequest = {
      votingId: 'V1ASDF',
    }

    const result = await retrieveVotingSummary(request)
    const expectedStats = votesDistribution.reduce((candidatesStats, vote) => {
      const [candidateId, choice] = vote
      if (!candidatesStats[candidateId]) {
        candidatesStats[candidateId] = { guilty: 0, innocent: 0, elect: 0, pass: 0 }
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
    expect(result.finalVeredict).to.exist
    if (result.finalVeredict) {
      expect(result.finalVeredict['V1ASDF']).to.equal('guilty')
      expect(result.finalVeredict['V2ASDF']).to.equal('undecided')
    }
  })
})
