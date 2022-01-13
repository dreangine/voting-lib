import { expect } from 'chai'
import * as chai from 'chai'
import * as spies from 'chai-spies'
import * as chaiPromised from 'chai-as-promised'

import {
  CandidatesStats,
  VoteData,
  VoterData,
  VotingData,
  VotingType,
  VoterId,
  VotesStats,
  CandidateStats,
  VotingId,
} from './types'

import {
  DEFAULT_CALLBACKS,
  DEFAULT_CANDIDATE_STATS,
  generateVoteId,
  generateVoterId,
  generateVotingId,
  MAX_VOTING_DURATION,
  MIN_VOTING_DURATION,
  registerVote,
  registerVoteByUserId,
  registerVoters,
  registerVoting,
  retrieveVotingSummary,
  setCallbacks,
} from './index'

chai.use(spies)
chai.use(chaiPromised)

// Setup
const nowDate = new Date()
const yesterdayDate = new Date(nowDate.getTime() - 1000 * 60 * 60 * 24)
const beforeYesterdayDate = new Date(yesterdayDate.getTime() - 1000 * 60 * 60 * 24)
const tomorrowDate = new Date(nowDate.getTime() + 24 * 60 * 60 * 1000)
const votingTypes: VotingType[] = ['election', 'judgement']
let generatedVoters: VoterId[]
let generatedVotingId: VotingId

function getStartedBy(): VoterId {
  const [startedBy] = generatedVoters
  return startedBy
}

function getCandidates(): VoterId[] {
  const [, ...candidates] = generatedVoters
  return candidates
}

function generateVotingBase(): Pick<
  VotingData,
  'votingDescription' | 'startedBy' | 'candidates' | 'totalVoters'
> {
  return {
    votingDescription: {
      'en-US': 'Test voting',
    },
    startedBy: getStartedBy(),
    candidates: getCandidates(),
    totalVoters: generatedVoters.length,
  }
}

function generateOngoingVotingBase(): Omit<VotingData, 'votingId' | 'votingType'> {
  return {
    ...generateVotingBase(),
    startsAt: yesterdayDate,
    endsAt: tomorrowDate,
    createdAt: yesterdayDate,
    updatedAt: yesterdayDate,
  }
}

function generateEndedVotingBase(): Omit<VotingData, 'votingId' | 'votingType'> {
  return {
    ...generateVotingBase(),
    startsAt: beforeYesterdayDate,
    endsAt: yesterdayDate,
    createdAt: yesterdayDate,
    updatedAt: yesterdayDate,
  }
}

function generateExpectedStats(...candidatesStats: CandidateStats[]): CandidatesStats {
  const [, ...candidates] = generatedVoters
  return candidates.reduce((stats, candidate, index) => {
    stats[candidate] = candidatesStats[index]
    return stats
  }, {} as CandidatesStats)
}

before(async () => {
  generatedVoters = [await generateVoterId(), await generateVoterId(), await generateVoterId()]
})

beforeEach(async () => {
  // Reset callbacks
  setCallbacks(DEFAULT_CALLBACKS)
  generatedVotingId = await generateVotingId()
})

describe('Not implemented', () => {
  it('registerVoters', async () => {
    await expect(
      registerVoters({
        userIds: ['U1ASDF', 'U2ASDF'],
      })
    ).to.be.rejectedWith(/Not implemented/)
  })
  it('registerVoting', async () => {
    await expect(
      registerVoting({
        votingParams: {
          votingDescription: {
            'en-US': 'Test voting',
          },
          votingType: 'election',
          startedBy: getStartedBy(),
          candidates: getCandidates(),
          endsAt: tomorrowDate,
        },
      })
    ).to.be.rejectedWith(/Not implemented/)
  })
  it('registerVote', async () => {
    await expect(
      registerVote({
        voteParams: {
          votingId: await generateVotingId(),
          voterId: getStartedBy(),
          choices: [
            {
              candidateId: getCandidates()[0],
              veredict: 'guilty',
            },
          ],
        },
      })
    ).to.be.rejectedWith(/Not implemented/)
  })
  it('retrieveVotingSummary', async () => {
    await expect(
      retrieveVotingSummary({
        votingId: await generateVotingId(),
      })
    ).to.be.rejectedWith(/Not implemented/)
  })
})

describe('Voter', () => {
  const userIds = ['U1ASDF', 'U2ASDF']
  it('should add voters', async () => {
    const persistVotersSpy = chai.spy(() =>
      Promise.resolve({
        inserts: userIds.length,
      })
    )

    setCallbacks({
      persistVoters: persistVotersSpy,
    })

    const response = await registerVoters({
      userIds,
    })
    const { voters: responseVoters } = response

    expect(persistVotersSpy).to.have.been.called.once
    expect(persistVotersSpy).to.have.been.called.with(responseVoters)
    expect(responseVoters).to.exist
    responseVoters &&
      responseVoters.forEach((voter) => {
        expect(voter.voterId).to.exist
      })
  })

  it('should add voters - omit data', async () => {
    const persistVotersSpy = chai.spy(() =>
      Promise.resolve({
        inserts: userIds.length,
      })
    )

    setCallbacks({
      persistVoters: persistVotersSpy,
    })

    const response = await registerVoters({
      userIds,
      omitReturnedData: true,
    })

    expect(persistVotersSpy).to.have.been.called.once
    expect(response.voters).to.be.undefined
  })
})

describe('Voting', () => {
  votingTypes.forEach((votingType) => {
    describe(`Voting type: ${votingType}`, async () => {
      it('should start a voting', async () => {
        const persistVotingSpy = chai.spy(() =>
          Promise.resolve({
            inserts: 1,
          })
        )
        const checkActiveVotersSpy = chai.spy(() =>
          Promise.resolve({
            ...generatedVoters.reduce((acc, candidate) => {
              acc[candidate] = true
              return acc
            }, {}),
          })
        )
        const countActiveVotersSpy = chai.spy(() => Promise.resolve(generatedVoters.length))

        setCallbacks({
          persistVoting: persistVotingSpy,
          checkActiveVoters: checkActiveVotersSpy,
          countActiveVoters: countActiveVotersSpy,
        })

        const response = await registerVoting({
          votingParams: {
            votingDescription: {
              'en-US': 'Test voting',
            },
            votingType,
            startedBy: getStartedBy(),
            candidates: getCandidates(),
            endsAt: tomorrowDate,
          },
        })
        const { voting: responseVoting } = response

        expect(persistVotingSpy).to.have.been.called.once
        expect(persistVotingSpy).to.have.been.called.with(responseVoting)
        expect(checkActiveVotersSpy).to.have.been.called.once
        expect(checkActiveVotersSpy).to.have.been.called.with(generatedVoters)
        expect(countActiveVotersSpy).to.have.been.called.once
        expect(responseVoting.votingId).to.exist
        expect(responseVoting.startsAt).to.exist
        expect(responseVoting.totalVoters).to.equal(generatedVoters.length)
      })

      it('should have all voters registered', async () => {
        const [firstCandidate, ...others] = getCandidates()
        const checkActiveVotersSpy = chai.spy(() =>
          Promise.resolve({
            [getStartedBy()]: false,
            [firstCandidate]: false,
            ...others.reduce((acc, candidate) => {
              acc[candidate] = true
              return acc
            }, {}),
          })
        )

        setCallbacks({
          checkActiveVoters: checkActiveVotersSpy,
        })

        await expect(
          registerVoting({
            votingParams: {
              votingDescription: {
                'en-US': 'Test voting',
              },
              votingType,
              startedBy: getStartedBy(),
              candidates: getCandidates(),
              endsAt: tomorrowDate,
            },
          })
        ).to.be.rejectedWith(`Voters ${[getStartedBy(), firstCandidate].join(', ')} do not exist`)
        expect(checkActiveVotersSpy).to.have.been.called.once
      })

      if (votingType === 'election') {
        it('an election must have more than 1 candidate', async () => {
          await expect(
            registerVoting({
              votingParams: {
                votingDescription: {
                  'en-US': 'Test election',
                },
                votingType,
                startedBy: getStartedBy(),
                candidates: [getCandidates()[0]],
                endsAt: tomorrowDate,
              },
            })
          ).to.be.rejectedWith(/Election must have at least \d+ candidates/)
        })
      }
    })
  })
  it('a voting cannot be too short', async () => {
    await expect(
      registerVoting({
        votingParams: {
          votingDescription: {
            'en-US': 'Test voting',
          },
          votingType: 'election',
          startedBy: getStartedBy(),
          candidates: getCandidates(),
          startsAt: nowDate,
          endsAt: new Date(nowDate.getTime() + MIN_VOTING_DURATION - 1),
        },
      })
    ).to.be.rejectedWith('Voting duration is too short')
  })

  it('a voting cannot be too long', async () => {
    await expect(
      registerVoting({
        votingParams: {
          votingDescription: {
            'en-US': 'Test voting',
          },
          votingType: 'election',
          startedBy: getStartedBy(),
          candidates: getCandidates(),
          startsAt: nowDate,
          endsAt: new Date(nowDate.getTime() + MAX_VOTING_DURATION + 1),
        },
      })
    ).to.be.rejectedWith('Voting duration is too long')
  })

  it('a voting cannot end before it starts', async () => {
    await expect(
      registerVoting({
        votingParams: {
          votingDescription: {
            'en-US': 'Test voting',
          },
          votingType: 'election',
          startedBy: getStartedBy(),
          candidates: getCandidates(),
          startsAt: tomorrowDate,
          endsAt: new Date(tomorrowDate.getTime() - 1),
        },
      })
    ).to.be.rejectedWith(`Voting cannot end before it starts`)
  })

  it('a voting cannot be started by a candidate', async () => {
    await expect(
      registerVoting({
        votingParams: {
          votingDescription: {
            'en-US': 'Test election',
          },
          votingType: 'election',
          startedBy: getStartedBy(),
          candidates: [getStartedBy(), ...getCandidates()],
          endsAt: tomorrowDate,
        },
      })
    ).to.be.rejectedWith('Voting cannot be started by a candidate')
  })
})

describe('Vote', () => {
  votingTypes.forEach((votingType) => {
    describe(`Voting type: ${votingType}`, () => {
      const veredict = votingType === 'election' ? 'elect' : 'guilty'
      it('should add a vote', async () => {
        const retrieveVotingSpy = chai.spy(async () => ({
          data: {
            ...generateOngoingVotingBase(),
            votingId: generatedVotingId,
            votingType,
          } as VotingData,
        }))
        const persistVoteSpy = chai.spy(() =>
          Promise.resolve({
            inserts: 1,
          })
        )

        setCallbacks({
          retrieveVoting: retrieveVotingSpy,
          persistVote: persistVoteSpy,
        })

        const response = await registerVote({
          voteParams: {
            votingId: generatedVotingId,
            voterId: getStartedBy(),
            choices: [
              {
                candidateId: getCandidates()[0],
                veredict,
              },
            ],
          },
        })
        const { vote: responseVote } = response

        expect(retrieveVotingSpy).to.have.been.called.once
        expect(retrieveVotingSpy).to.have.been.called.with(generatedVotingId)
        expect(persistVoteSpy).to.have.been.called.once
        expect(persistVoteSpy).to.have.been.called.with(responseVote)
        expect(responseVote.voteId).to.exist
        expect(responseVote.createdAt).to.exist
      })

      it('should add a vote - by userId', async () => {
        const userId = 'U1ASDF'
        const retrieveVotingSpy = chai.spy(async () => ({
          data: {
            ...generateOngoingVotingBase(),
            votingId: generatedVotingId,
            votingType,
          } as VotingData,
        }))
        const persistVoteSpy = chai.spy(() =>
          Promise.resolve({
            inserts: 1,
          })
        )
        const retrieveVoterSpy = chai.spy(() =>
          Promise.resolve({
            data: {
              userId,
              voterId: getStartedBy(),
            } as VoterData,
          })
        )

        setCallbacks({
          retrieveVoting: retrieveVotingSpy,
          persistVote: persistVoteSpy,
          retrieveVoter: retrieveVoterSpy,
        })

        const response = await registerVoteByUserId({
          voteParams: {
            votingId: generatedVotingId,
            userId,
            choices: [
              {
                candidateId: getCandidates()[0],
                veredict,
              },
            ],
          },
        })
        const { vote: responseVote } = response

        expect(retrieveVotingSpy).to.have.been.called.once
        expect(retrieveVotingSpy).to.have.been.called.with(generatedVotingId)
        expect(retrieveVoterSpy).to.have.been.called.once
        expect(retrieveVoterSpy).to.have.been.called.with(userId)
        expect(persistVoteSpy).to.have.been.called.once
        expect(persistVoteSpy).to.have.been.called.with(responseVote)
        expect(responseVote.voteId).to.exist
        expect(responseVote.voterId).to.equal(getStartedBy())
        expect(responseVote.createdAt).to.exist
      })

      it('cannot vote on yourself', async () => {
        await expect(
          registerVote({
            voteParams: {
              votingId: await generateVotingId(),
              voterId: getStartedBy(),
              choices: [
                {
                  candidateId: getStartedBy(),
                  veredict,
                },
              ],
            },
          })
        ).to.be.rejectedWith('Voter cannot vote for themselves')
      })

      it('cannot vote after voting has ended', async () => {
        const retrieveVotingSpy = chai.spy(async () => ({
          data: {
            ...generateEndedVotingBase(),
            votingId: generatedVotingId,
            votingType,
          } as VotingData,
        }))

        setCallbacks({
          retrieveVoting: retrieveVotingSpy,
        })

        await expect(
          registerVote({
            voteParams: {
              votingId: generatedVotingId,
              voterId: getStartedBy(),
              choices: [
                {
                  candidateId: getCandidates()[0],
                  veredict,
                },
              ],
            },
          })
        ).to.be.rejectedWith('Voting has ended')
        expect(retrieveVotingSpy).to.have.been.called.once
        expect(retrieveVotingSpy).to.have.been.called.with(generatedVotingId)
      })
    })
  })
  it('voting does not exist', async () => {
    const retrieveVotingSpy = chai.spy(() => Promise.resolve({ data: null }))

    setCallbacks({
      retrieveVoting: retrieveVotingSpy,
    })

    await expect(
      registerVote({
        voteParams: {
          votingId: generatedVotingId,
          voterId: getStartedBy(),
          choices: [
            {
              candidateId: getCandidates()[0],
              veredict: 'pass',
            },
          ],
        },
      })
    ).to.be.rejectedWith('Voting does not exist')
    expect(retrieveVotingSpy).to.have.been.called.once
    expect(retrieveVotingSpy).to.have.been.called.with(generatedVotingId)
  })

  it('voter does not exist', async () => {
    const userId = 'U1ASDF'
    const retrieveVoterSpy = chai.spy(() => Promise.resolve({ data: null }))

    setCallbacks({
      retrieveVoter: retrieveVoterSpy,
    })

    await expect(
      registerVoteByUserId({
        voteParams: {
          votingId: generatedVotingId,
          userId,
          choices: [
            {
              candidateId: getCandidates()[0],
              veredict: 'pass',
            },
          ],
        },
      })
    ).to.be.rejectedWith('Voter not registered')
    expect(retrieveVoterSpy).to.have.been.called.once
    expect(retrieveVoterSpy).to.have.been.called.with(userId)
  })
})

describe('Voting summary', () => {
  votingTypes.forEach((votingType) => {
    describe(`Voting type: ${votingType}`, () => {
      it('should retrieve voting summary - ongoing voting', async () => {
        const [firstCandidate, secondCandidate] = getCandidates()
        const votesDistribution = [
          [firstCandidate, votingType === 'election' ? 'elect' : 'guilty'],
          [firstCandidate, votingType === 'election' ? 'elect' : 'guilty'],
          [firstCandidate, votingType === 'election' ? 'pass' : 'innocent'],
          [secondCandidate, votingType === 'election' ? 'elect' : 'guilty'],
          [secondCandidate, votingType === 'election' ? 'pass' : 'innocent'],
        ]
        const votes = Promise.all(
          votesDistribution.map(
            async ([candidateId, vote]) =>
              ({
                voteId: await generateVoteId(),
                votingId: generatedVotingId,
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
        const retrieveVotingSpy = chai.spy(async () => ({
          data: {
            ...generateOngoingVotingBase(),
            votingId: generatedVotingId,
            votingType,
          } as VotingData,
        }))
        const retrieveVotesSpy = chai.spy(async () => ({
          data: await votes,
        }))

        setCallbacks({
          retrieveVoting: retrieveVotingSpy,
          retrieveVotes: retrieveVotesSpy,
        })

        const result = await retrieveVotingSummary({
          votingId: generatedVotingId,
        })
        const expectedStats: CandidatesStats = generateExpectedStats(
          {
            ...DEFAULT_CANDIDATE_STATS,
            [votingType === 'election' ? 'elect' : 'guilty']: 2,
            [votingType === 'election' ? 'pass' : 'innocent']: 1,
          },
          {
            ...DEFAULT_CANDIDATE_STATS,
            [votingType === 'election' ? 'elect' : 'guilty']: 1,
            [votingType === 'election' ? 'pass' : 'innocent']: 1,
          }
        )
        expect(retrieveVotingSpy).to.have.been.called.once
        expect(retrieveVotingSpy).to.have.been.called.with(generatedVotingId)
        expect(retrieveVotesSpy).to.have.been.called.once
        expect(retrieveVotesSpy).to.have.been.called.with(generatedVotingId)
        expect(result).to.exist
        expect(result.candidatesStats).to.deep.equal(expectedStats)
        expect(result.votingSummaryState).to.equal('partial')
        expect(result.finalVeredict).to.not.exist
      })

      it('candidates without votes - ongoing voting', async () => {
        const [firstCandidate] = getCandidates()
        const votesDistribution = [
          [firstCandidate, votingType === 'election' ? 'elect' : 'guilty'],
          [firstCandidate, votingType === 'election' ? 'elect' : 'guilty'],
          [firstCandidate, votingType === 'election' ? 'pass' : 'innocent'],
        ]
        const votes = Promise.all(
          votesDistribution.map(
            async ([candidateId, vote]) =>
              ({
                voteId: await generateVoteId(),
                votingId: generatedVotingId,
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
        const retrieveVotingSpy = chai.spy(async () => ({
          data: {
            ...generateOngoingVotingBase(),
            votingId: generatedVotingId,
            votingType,
          } as VotingData,
        }))
        const retrieveVotesSpy = chai.spy(async () => ({
          data: await votes,
        }))

        setCallbacks({
          retrieveVoting: retrieveVotingSpy,
          retrieveVotes: retrieveVotesSpy,
        })

        const result = await retrieveVotingSummary({
          votingId: generatedVotingId,
        })
        const expectedStats: CandidatesStats = generateExpectedStats(
          {
            ...DEFAULT_CANDIDATE_STATS,
            [votingType === 'election' ? 'elect' : 'guilty']: 2,
            [votingType === 'election' ? 'pass' : 'innocent']: 1,
          },
          {
            guilty: 0,
            innocent: 0,
            elect: 0,
            pass: 0,
          }
        )
        expect(retrieveVotingSpy).to.have.been.called.once
        expect(retrieveVotingSpy).to.have.been.called.with(generatedVotingId)
        expect(retrieveVotesSpy).to.have.been.called.once
        expect(retrieveVotesSpy).to.have.been.called.with(generatedVotingId)
        expect(result).to.exist
        expect(result.candidatesStats).to.deep.equal(expectedStats)
        expect(result.votingSummaryState).to.equal('partial')
        expect(result.finalVeredict).to.not.exist
      })

      it('should retrieve voting summary - ended voting', async () => {
        const [firstCandidate, secondCandidate] = getCandidates()
        const votesStats: VotesStats = {
          [firstCandidate]: {
            [votingType === 'election' ? 'elect' : 'guilty']: 2,
            [votingType === 'election' ? 'pass' : 'innocent']: 1,
          },
          [secondCandidate]: {
            [votingType === 'election' ? 'elect' : 'guilty']: 1,
            [votingType === 'election' ? 'pass' : 'innocent']: 2,
          },
        }
        const retrieveVotingSpy = chai.spy(async () => ({
          data: {
            ...generateEndedVotingBase(),
            votingId: generatedVotingId,
            votingType,
          } as VotingData,
        }))
        const retrieveVotesSpy = chai.spy(async () => ({
          data: votesStats,
        }))

        setCallbacks({
          retrieveVoting: retrieveVotingSpy,
          retrieveVotes: retrieveVotesSpy,
        })

        const result = await retrieveVotingSummary({
          votingId: generatedVotingId,
        })
        const expectedStats: CandidatesStats = generateExpectedStats(
          {
            ...DEFAULT_CANDIDATE_STATS,
            [votingType === 'election' ? 'elect' : 'guilty']: 2,
            [votingType === 'election' ? 'pass' : 'innocent']: 1,
          },
          {
            ...DEFAULT_CANDIDATE_STATS,
            [votingType === 'election' ? 'elect' : 'guilty']: 1,
            [votingType === 'election' ? 'pass' : 'innocent']: 2,
          }
        )
        expect(retrieveVotingSpy).to.have.been.called.once
        expect(retrieveVotingSpy).to.have.been.called.with(generatedVotingId)
        expect(retrieveVotesSpy).to.have.been.called.once
        expect(retrieveVotesSpy).to.have.been.called.with(generatedVotingId)
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
        const [firstCandidate, secondCandidate] = getCandidates()
        const votesDistribution = [
          [firstCandidate, votingType === 'election' ? 'elect' : 'guilty'],
          [firstCandidate, votingType === 'election' ? 'pass' : 'innocent'],
          [secondCandidate, votingType === 'election' ? 'elect' : 'guilty'],
          [secondCandidate, votingType === 'election' ? 'pass' : 'innocent'],
        ]
        const votes = Promise.all(
          votesDistribution.map(
            async ([candidateId, vote]) =>
              ({
                voteId: await generateVoteId(),
                votingId: generatedVotingId,
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
        const retrieveVotingSpy = chai.spy(async () => ({
          data: {
            ...generateEndedVotingBase(),
            votingId: generatedVotingId,
            votingType,
          } as VotingData,
        }))
        const retrieveVotesSpy = chai.spy(async () => ({
          data: await votes,
        }))

        setCallbacks({
          retrieveVoting: retrieveVotingSpy,
          retrieveVotes: retrieveVotesSpy,
        })

        const result = await retrieveVotingSummary({
          votingId: generatedVotingId,
        })
        const expectedStats: CandidatesStats = generateExpectedStats(
          {
            ...DEFAULT_CANDIDATE_STATS,
            [votingType === 'election' ? 'elect' : 'guilty']: 1,
            [votingType === 'election' ? 'pass' : 'innocent']: 1,
          },
          {
            ...DEFAULT_CANDIDATE_STATS,
            [votingType === 'election' ? 'elect' : 'guilty']: 1,
            [votingType === 'election' ? 'pass' : 'innocent']: 1,
          }
        )
        expect(retrieveVotingSpy).to.have.been.called.once
        expect(retrieveVotingSpy).to.have.been.called.with(generatedVotingId)
        expect(retrieveVotesSpy).to.have.been.called.once
        expect(retrieveVotesSpy).to.have.been.called.with(generatedVotingId)
        expect(result).to.exist
        expect(result.candidatesStats).to.deep.equal(expectedStats)
        expect(result.votingSummaryState).to.equal('final')
        expect(result.finalVeredict).to.exist
        if (result.finalVeredict) {
          expect(result.finalVeredict[firstCandidate]).to.equal('undecided')
          expect(result.finalVeredict[secondCandidate]).to.equal('undecided')
        }
      })

      it('should retrieve voting summary - not enough votes', async () => {
        const [firstCandidate, secondCandidate] = getCandidates()
        const votesDistribution = [
          [firstCandidate, votingType === 'election' ? 'elect' : 'guilty'],
          [firstCandidate, votingType === 'election' ? 'elect' : 'guilty'],
          [firstCandidate, votingType === 'election' ? 'pass' : 'innocent'],
          [secondCandidate, votingType === 'election' ? 'pass' : 'innocent'],
          [secondCandidate, votingType === 'election' ? 'pass' : 'innocent'],
        ]
        const votes = Promise.all(
          votesDistribution.map(
            async ([candidateId, vote]) =>
              ({
                voteId: await generateVoteId(),
                votingId: generatedVotingId,
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
        const retrieveVotingSpy = chai.spy(async () => ({
          data: {
            ...generateEndedVotingBase(),
            votingId: generatedVotingId,
            votingType,
            totalVoters: 6,
            requiredParticipationPercentage: 0.5,
          } as VotingData,
        }))
        const retrieveVotesSpy = chai.spy(async () => ({
          data: await votes,
        }))

        setCallbacks({
          retrieveVoting: retrieveVotingSpy,
          retrieveVotes: retrieveVotesSpy,
        })

        const result = await retrieveVotingSummary({
          votingId: generatedVotingId,
        })
        const expectedStats: CandidatesStats = generateExpectedStats(
          {
            ...DEFAULT_CANDIDATE_STATS,
            [votingType === 'election' ? 'elect' : 'guilty']: 2,
            [votingType === 'election' ? 'pass' : 'innocent']: 1,
          },
          {
            ...DEFAULT_CANDIDATE_STATS,
            [votingType === 'election' ? 'pass' : 'innocent']: 2,
          }
        )
        expect(retrieveVotingSpy).to.have.been.called.once
        expect(retrieveVotingSpy).to.have.been.called.with(generatedVotingId)
        expect(retrieveVotesSpy).to.have.been.called.once
        expect(retrieveVotesSpy).to.have.been.called.with(generatedVotingId)
        expect(result).to.exist
        expect(result.candidatesStats).to.deep.equal(expectedStats)
        expect(result.votingSummaryState).to.equal('final')
        expect(result.finalVeredict).to.exist
        if (result.finalVeredict) {
          expect(result.finalVeredict[firstCandidate]).to.equal(
            votingType === 'election' ? 'elected' : 'guilty'
          )
          expect(result.finalVeredict[secondCandidate]).to.equal('undecided')
        }
      })

      it('no votes - ongoing voting', async () => {
        const retrieveVotingSpy = chai.spy(async () => ({
          data: {
            ...generateOngoingVotingBase(),
            votingId: generatedVotingId,
            votingType,
          } as VotingData,
        }))
        const retrieveVotesSpy = chai.spy(async () => ({
          data: null,
        }))

        setCallbacks({
          retrieveVoting: retrieveVotingSpy,
          retrieveVotes: retrieveVotesSpy,
        })

        const result = await retrieveVotingSummary({
          votingId: generatedVotingId,
        })
        const expectedStats = getCandidates().reduce((candidatesStats, candidateId) => {
          candidatesStats[candidateId] = DEFAULT_CANDIDATE_STATS
          return candidatesStats
        }, {} as CandidatesStats)
        expect(retrieveVotingSpy).to.have.been.called.once
        expect(retrieveVotingSpy).to.have.been.called.with(generatedVotingId)
        expect(retrieveVotesSpy).to.have.been.called.once
        expect(retrieveVotesSpy).to.have.been.called.with(generatedVotingId)
        expect(result).to.exist
        expect(result.candidatesStats).to.deep.equal(expectedStats)
        expect(result.votingSummaryState).to.equal('partial')
        expect(result.finalVeredict).to.not.exist
      })

      it('no votes - ended voting', async () => {
        const retrieveVotingSpy = chai.spy(async () => ({
          data: {
            ...generateEndedVotingBase(),
            votingId: generatedVotingId,
            votingType,
          } as VotingData,
        }))
        const retrieveVotesSpy = chai.spy(async () => ({
          data: null,
        }))

        setCallbacks({
          retrieveVoting: retrieveVotingSpy,
          retrieveVotes: retrieveVotesSpy,
        })

        const result = await retrieveVotingSummary({
          votingId: generatedVotingId,
        })
        const expectedStats = getCandidates().reduce((candidatesStats, candidateId) => {
          candidatesStats[candidateId] = DEFAULT_CANDIDATE_STATS
          return candidatesStats
        }, {} as CandidatesStats)
        expect(retrieveVotingSpy).to.have.been.called.once
        expect(retrieveVotingSpy).to.have.been.called.with(generatedVotingId)
        expect(retrieveVotesSpy).to.have.been.called.once
        expect(retrieveVotesSpy).to.have.been.called.with(generatedVotingId)
        expect(result).to.exist
        expect(result.candidatesStats).to.deep.equal(expectedStats)
        expect(result.votingSummaryState).to.equal('final')
        expect(result.finalVeredict).to.exist
        getCandidates().forEach((candidateId) => {
          expect(result.finalVeredict && result.finalVeredict[candidateId]).to.equal('undecided')
        })
      })
    })
  })

  it('voting not found', async () => {
    const retrieveVotingSpy = chai.spy(() => Promise.resolve({ data: null }))
    const retrieveVotesSpy = chai.spy(() => Promise.resolve({ data: [] }))

    setCallbacks({
      retrieveVoting: retrieveVotingSpy,
      retrieveVotes: retrieveVotesSpy,
    })

    await expect(
      retrieveVotingSummary({
        votingId: generatedVotingId,
      })
    ).to.be.rejectedWith('Voting not found')
    expect(retrieveVotingSpy).to.have.been.called.once
    expect(retrieveVotingSpy).to.have.been.called.with(generatedVotingId)
    expect(retrieveVotesSpy).to.have.been.called.once
    expect(retrieveVotesSpy).to.have.been.called.with(generatedVotingId)
  })

  it('unable to retrieve voting', async () => {
    const retrieveVotingSpy = chai.spy(() => Promise.reject('Unknown error'))

    setCallbacks({
      retrieveVoting: retrieveVotingSpy,
    })

    await expect(
      retrieveVotingSummary({
        votingId: generatedVotingId,
      })
    ).to.be.rejectedWith('Unable to retrieve voting: Unknown error')
    expect(retrieveVotingSpy).to.have.been.called.once
    expect(retrieveVotingSpy).to.have.been.called.with(generatedVotingId)
  })

  it('unable to retrieve votes', async () => {
    const retrieveVotingSpy = chai.spy(() => Promise.resolve({ data: null }))
    const retrieveVotesSpy = chai.spy(() => Promise.reject('Unknown error'))

    setCallbacks({
      retrieveVoting: retrieveVotingSpy,
      retrieveVotes: retrieveVotesSpy,
    })

    await expect(
      retrieveVotingSummary({
        votingId: generatedVotingId,
      })
    ).to.be.rejectedWith('Unable to retrieve votes: Unknown error')
    expect(retrieveVotingSpy).to.have.been.called.once
    expect(retrieveVotingSpy).to.have.been.called.with(generatedVotingId)
    expect(retrieveVotesSpy).to.have.been.called.once
    expect(retrieveVotesSpy).to.have.been.called.with(generatedVotingId)
  })
})
