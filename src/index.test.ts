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
  VotingType,
  VoterId,
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
const votingTypes: VotingType[] = ['election', 'judgement']
const voters: {
  starter: VoterId
  candidates: VoterId[]
  totalVoters: () => number
} = {
  starter: 'V1ASDF',
  candidates: ['V2ASDF', 'V3ASDF'],
  totalVoters: () => voters.candidates.length + 1,
}

before(async () => {
  voters.starter = await generateVoterId()
  voters.candidates = [await generateVoterId(), await generateVoterId()]
})

// beforeEach(() => {
//   setCallbacks({
//     persistVote: () => Promise.resolve(),
//     persistVoters: () => Promise.resolve(),
//     persistVoting: () => Promise.resolve(),
//     retrieveVoting: () => Promise.resolve(),
//     retrieveVoter: () => Promise.resolve(),
//     retrieveVotes: () => Promise.resolve(),
//     checkActiveVoters: () => Promise.resolve({}),
//     countActiveVoters: () => Promise.resolve(0),
//   })
// })

describe('Voter', () => {
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

describe('Voting', () => {
  votingTypes.forEach((votingType) => {
    describe(`Voting type: ${votingType}`, async () => {
      it('should start a voting', async () => {
        const spy = chai.spy(() => Promise.resolve())
        const checkVotersSpy = chai.spy(() =>
          Promise.resolve({
            [voters.starter]: true,
            ...voters.candidates.reduce((acc, candidate) => {
              acc[candidate] = true
              return acc
            }, {}),
          })
        )
        const spyCoundActiveVoters = chai.spy(() => Promise.resolve(voters.totalVoters()))

        setCallbacks({
          persistVoting: spy,
          checkActiveVoters: checkVotersSpy,
          countActiveVoters: spyCoundActiveVoters,
        })

        const request: StartVotingRequest = {
          votingParams: {
            votingDescription: {
              'en-US': 'Test voting',
            },
            votingType,
            startedBy: voters.starter,
            candidates: voters.candidates,
            endsAt: new Date(),
          },
        }

        const response = await startVoting(request)
        const { voting: responseVoting } = response

        expect(spy).to.have.been.called.once
        expect(spy).to.have.been.called.with(responseVoting)
        expect(checkVotersSpy).to.have.been.called.once
        expect(checkVotersSpy).to.have.been.called.with([voters.starter, ...voters.candidates])
        expect(spyCoundActiveVoters).to.have.been.called.once
        expect(responseVoting.votingId).to.exist
        expect(responseVoting.startsAt).to.exist
        expect(responseVoting.totalVoters).to.equal(voters.totalVoters())
      })

      it('should have all voters registered', async () => {
        const [firstCandidate, ...others] = voters.candidates
        const spy = chai.spy(() => Promise.resolve())
        const checkVotersSpy = chai.spy(() =>
          Promise.resolve({
            [voters.starter]: false,
            [firstCandidate]: false,
            ...others.reduce((acc, candidate) => {
              acc[candidate] = true
              return acc
            }, {}),
          })
        )

        setCallbacks({
          persistVoting: spy,
          checkActiveVoters: checkVotersSpy,
        })

        const request: StartVotingRequest = {
          votingParams: {
            votingDescription: {
              'en-US': 'Test voting',
            },
            votingType,
            startedBy: voters.starter,
            candidates: voters.candidates,
            endsAt: new Date(),
          },
        }

        await expect(startVoting(request)).to.be.rejectedWith(
          `Voters ${[voters.starter, firstCandidate].join(', ')} do not exist`
        )
        expect(checkVotersSpy).to.have.been.called.once
        expect(spy).to.not.have.been.called
      })

      it('a voting cannot be started by a candidate', async () => {
        const spy = chai.spy(() => Promise.resolve())
        const checkVotersSpy = chai.spy(() => Promise.resolve({}))

        setCallbacks({
          persistVoting: spy,
          checkActiveVoters: checkVotersSpy,
        })

        const request: StartVotingRequest = {
          votingParams: {
            votingDescription: {
              'en-US': 'Test election',
            },
            votingType,
            startedBy: voters.starter,
            candidates: [voters.starter],
            endsAt: new Date(),
          },
        }

        await expect(startVoting(request)).to.be.rejectedWith(
          'Voting cannot be started by a candidate'
        )
        expect(checkVotersSpy).to.not.have.been.called
        expect(spy).to.not.have.been.called
      })
    })
  })
})

describe('Vote', () => {
  votingTypes.forEach((votingType) => {
    describe(`Voting type: ${votingType}`, () => {
      const veredict = votingType === 'election' ? 'elect' : 'guilty'
      it('should add a vote', async () => {
        const votingId = await generateVotingId()
        const spyRetrieveVoting = chai.spy(
          async () =>
            ({
              votingId,
              votingDescription: {
                'en-US': `Test voting (${votingType})`,
              },
              votingType,
              startsAt: yesterdayDate,
              endsAt: tomorrowDate,
              candidates: voters.candidates,
              startedBy: voters.starter,
              totalVoters: voters.candidates.length + 1,
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
            voterId: voters.starter,
            choices: [
              {
                candidateId: voters.candidates[0],
                veredict,
              },
            ],
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
      })

      it('should add a vote - by userId', async () => {
        const votingId = await generateVotingId()
        const userId = 'U1ASDF'
        const spyRetrieveVoting = chai.spy(
          async () =>
            ({
              votingId,
              votingDescription: {
                'en-US': `Test voting (${votingType})`,
              },
              votingType,
              startsAt: yesterdayDate,
              endsAt: tomorrowDate,
              candidates: voters.candidates,
              startedBy: voters.starter,
              totalVoters: voters.candidates.length + 1,
              createdAt: yesterdayDate,
              updatedAt: yesterdayDate,
            } as VotingData)
        )
        const spyPersistVote = chai.spy(() => Promise.resolve())
        const spyRetrieveVoter = chai.spy(() =>
          Promise.resolve({
            userId,
            voterId: voters.starter,
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
            choices: [
              {
                candidateId: voters.candidates[0],
                veredict,
              },
            ],
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
        expect(responseVote.voterId).to.equal(voters.starter)
        expect(responseVote.createdAt).to.exist
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
            votingId: await generateVotingId(),
            voterId: voters.starter,
            choices: [
              {
                candidateId: voters.starter,
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
        const votingId = await generateVotingId()
        const spyRetrieveVoting = chai.spy(
          async () =>
            ({
              votingId,
              votingDescription: {
                'en-US': `Test voting (${votingType})`,
              },
              votingType,
              startsAt: yesterdayDate,
              endsAt: yesterdayDate,
              candidates: voters.candidates,
              startedBy: voters.starter,
              totalVoters: 3,
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
            voterId: voters.starter,
            choices: [
              {
                candidateId: voters.candidates[0],
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

      it('voting does not exist', async () => {
        const votingId = await generateVotingId()
        const spyRetrieveVoting = chai.spy(() => Promise.resolve())
        const spyPersist = chai.spy(() => Promise.resolve())

        setCallbacks({
          retrieveVoting: spyRetrieveVoting,
          persistVote: spyPersist,
        })

        const request: RegisterVoteRequest = {
          voteParams: {
            votingId,
            voterId: voters.starter,
            choices: [
              {
                candidateId: voters.candidates[0],
                veredict,
              },
            ],
          },
        }

        await expect(registerVote(request)).to.be.rejectedWith('Voting does not exist')
        expect(spyRetrieveVoting).to.have.been.called.once
        expect(spyRetrieveVoting).to.have.been.called.with(votingId)
        expect(spyPersist).to.not.have.been.called
      })

      it('voter does not exist', async () => {
        const votingId = await generateVotingId()
        const userId = 'U1ASDF'
        const spyRetrieveVoting = chai.spy(() => Promise.resolve())
        const spyPersistVote = chai.spy(() => Promise.resolve())
        const spyRetrieveVoter = chai.spy(() => Promise.resolve())

        setCallbacks({
          retrieveVoting: spyRetrieveVoting,
          persistVote: spyPersistVote,
          retrieveVoter: spyRetrieveVoter,
        })

        const request: RegisterVoteByUserIdRequest = {
          voteParams: {
            votingId,
            userId,
            choices: [
              {
                candidateId: voters.candidates[0],
                veredict,
              },
            ],
          },
        }

        await expect(registerVoteByUserId(request)).to.be.rejectedWith('Voter not registered')
        expect(spyRetrieveVoter).to.have.been.called.once
        expect(spyRetrieveVoter).to.have.been.called.with(userId)
        expect(spyRetrieveVoting).to.not.have.been.called
        expect(spyPersistVote).to.not.have.been.called
      })
    })
  })
})

describe('Voting summary', () => {
  const [firstCandidate, secondCandidate] = voters.candidates
  votingTypes.forEach((votingType) => {
    describe(`Voting type: ${votingType}`, () => {
      it('should retrieve voting summary - ongoing voting', async () => {
        const votingId = await generateVotingId()
        const votesDistribution = [
          [firstCandidate, votingType === 'election' ? 'elect' : 'guilty'],
          [firstCandidate, votingType === 'election' ? 'elect' : 'guilty'],
          [firstCandidate, votingType === 'election' ? 'pass' : 'innocent'],
          [secondCandidate, votingType === 'election' ? 'elect' : 'guilty'],
          [secondCandidate, votingType === 'election' ? 'pass' : 'innocent'],
        ]
        const candidates = [...new Set(votesDistribution.map(([csandidateId]) => csandidateId))]
        const votes = Promise.all(
          votesDistribution.map(
            async ([candidateId, vote]) =>
              ({
                voteId: await generateVoteId(),
                votingId,
                voterId: await generateVoterId(),
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
        )
        const retrieveVotingSpy = chai.spy(
          async () =>
            ({
              votingId,
              votingDescription: {
                'en-US': 'Test voting',
              },
              votingType,
              startsAt: new Date(),
              endsAt: tomorrowDate,
              candidates: candidates,
              startedBy: voters.starter,
              totalVoters: candidates.length + 1,
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
          votingId,
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
        expect(retrieveVotingSpy).to.have.been.called.with(votingId)
        expect(retrieveVotesSpy).to.have.been.called.once
        expect(retrieveVotesSpy).to.have.been.called.with(votingId)
        expect(result).to.exist
        expect(result.candidatesStats).to.deep.equal(expectedStats)
        expect(result.votingSummaryState).to.equal('partial')
      })

      it('should retrieve voting summary - ended voting', async () => {
        const votingId = await generateVotingId()
        const votesDistribution = [
          [firstCandidate, votingType === 'election' ? 'elect' : 'guilty'],
          [firstCandidate, votingType === 'election' ? 'elect' : 'guilty'],
          [firstCandidate, votingType === 'election' ? 'pass' : 'innocent'],
          [secondCandidate, votingType === 'election' ? 'elect' : 'guilty'],
          [secondCandidate, votingType === 'election' ? 'pass' : 'innocent'],
          [secondCandidate, votingType === 'election' ? 'pass' : 'innocent'],
        ]
        const candidates = [...new Set(votesDistribution.map(([csandidateId]) => csandidateId))]
        const votes = Promise.all(
          votesDistribution.map(
            async ([candidateId, vote]) =>
              ({
                voteId: await generateVoteId(),
                votingId,
                voterId: await generateVoterId(),
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
        )
        const retrieveVotingSpy = chai.spy(
          async () =>
            ({
              votingId,
              votingDescription: {
                'en-US': 'Test voting',
              },
              votingType,
              startsAt: new Date(),
              endsAt: yesterdayDate,
              candidates: candidates,
              startedBy: voters.starter,
              totalVoters: candidates.length + 1,
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
          votingId,
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
        expect(retrieveVotingSpy).to.have.been.called.with(votingId)
        expect(retrieveVotesSpy).to.have.been.called.once
        expect(retrieveVotesSpy).to.have.been.called.with(votingId)
        expect(result).to.exist
        expect(result.candidatesStats).to.deep.equal(expectedStats)
        expect(result.votingSummaryState).to.equal('final')
        expect(result.finalVeredict).to.exist
        if (result.finalVeredict) {
          expect(result.finalVeredict[firstCandidate]).to.equal(
            votingType === 'election' ? 'elected' : 'guilty'
          )
          expect(result.finalVeredict[secondCandidate]).to.equal(
            votingType === 'election' ? 'not elected' : 'innocent'
          )
        }
      })

      it('should retrieve voting summary - ended voting (undecided)', async () => {
        const votingId = await generateVotingId()
        const votesDistribution = [
          [firstCandidate, votingType === 'election' ? 'elect' : 'guilty'],
          [firstCandidate, votingType === 'election' ? 'pass' : 'innocent'],
          [secondCandidate, votingType === 'election' ? 'elect' : 'guilty'],
          [secondCandidate, votingType === 'election' ? 'pass' : 'innocent'],
        ]
        const candidates = [...new Set(votesDistribution.map(([csandidateId]) => csandidateId))]
        const votes = Promise.all(
          votesDistribution.map(
            async ([candidateId, vote]) =>
              ({
                voteId: await generateVoteId(),
                votingId,
                voterId: await generateVoterId(),
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
        )
        const retrieveVotingSpy = chai.spy(
          async () =>
            ({
              votingId,
              votingDescription: {
                'en-US': 'Test voting',
              },
              votingType,
              startsAt: new Date(),
              endsAt: yesterdayDate,
              candidates: candidates,
              startedBy: voters.starter,
              totalVoters: candidates.length + 1,
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
          votingId,
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
        expect(retrieveVotingSpy).to.have.been.called.with(votingId)
        expect(retrieveVotesSpy).to.have.been.called.once
        expect(retrieveVotesSpy).to.have.been.called.with(votingId)
        expect(result).to.exist
        expect(result.candidatesStats).to.deep.equal(expectedStats)
        expect(result.votingSummaryState).to.equal('final')
        expect(result.finalVeredict).to.exist
        if (result.finalVeredict) {
          expect(result.finalVeredict[firstCandidate]).to.equal('undecided')
          expect(result.finalVeredict[secondCandidate]).to.equal('undecided')
        }
      })
    })
  })

  it('voting not found', async () => {
    const votingId = await generateVotingId()
    const retrieveVotingSpy = chai.spy(() => Promise.resolve())
    const retrieveVotesSpy = chai.spy(() => Promise.resolve())

    setCallbacks({
      retrieveVoting: retrieveVotingSpy,
      retrieveVotes: retrieveVotesSpy,
    })

    const request: RetrieveVotingSummaryRequest = {
      votingId,
    }

    await expect(retrieveVotingSummary(request)).to.be.rejectedWith('Voting not found')
    expect(retrieveVotingSpy).to.have.been.called.once
    expect(retrieveVotingSpy).to.have.been.called.with(votingId)
    expect(retrieveVotesSpy).to.not.have.been.called
  })

  it('unable to retrieve voting', async () => {
    const votingId = await generateVotingId()
    const retrieveVotingSpy = chai.spy(() => Promise.reject('Unknown error'))
    const retrieveVotesSpy = chai.spy(() => Promise.resolve())

    setCallbacks({
      retrieveVoting: retrieveVotingSpy,
      retrieveVotes: retrieveVotesSpy,
    })

    const request: RetrieveVotingSummaryRequest = {
      votingId,
    }

    await expect(retrieveVotingSummary(request)).to.be.rejectedWith(
      'Unable to retrieve voting: Unknown error'
    )
    expect(retrieveVotingSpy).to.have.been.called.once
    expect(retrieveVotingSpy).to.have.been.called.with(votingId)
    expect(retrieveVotesSpy).to.not.have.been.called
  })

  it('unable to retrieve voting', async () => {
    const votingId = await generateVotingId()
    const retrieveVotingSpy = chai.spy(() => Promise.resolve())
    const retrieveVotesSpy = chai.spy(() => Promise.reject('Unknown error'))

    setCallbacks({
      retrieveVoting: retrieveVotingSpy,
      retrieveVotes: retrieveVotesSpy,
    })

    const request: RetrieveVotingSummaryRequest = {
      votingId,
    }

    await expect(retrieveVotingSummary(request)).to.be.rejectedWith(
      'Unable to retrieve votes: Unknown error'
    )
    expect(retrieveVotingSpy).to.have.been.called.once
    expect(retrieveVotingSpy).to.have.been.called.with(votingId)
    expect(retrieveVotesSpy).to.have.been.called.once
    expect(retrieveVotesSpy).to.have.been.called.with(votingId)
  })
})
