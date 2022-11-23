import { expect } from 'chai'
import * as chai from 'chai'
import * as spies from 'chai-spies'
import * as chaiPromised from 'chai-as-promised'

import {
  DEFAULT_CALLBACKS,
  isCandidateBasedVotingType,
  MAX_VOTING_DURATION,
  MIN_VOTING_DURATION,
  setCallbacks,
} from '../src/common'
import { registerVoting, validateRegisterVoting } from '../src/voting'

import {
  allVotersIds,
  candidates,
  candidatesId,
  nowDate,
  startedBy,
  tomorrowDate,
  totalVoters,
  votingTypes,
} from './common'

chai.use(spies)
chai.use(chaiPromised)

beforeEach(async () => {
  // Reset callbacks
  setCallbacks(DEFAULT_CALLBACKS)
})

describe('Voting', () => {
  votingTypes.forEach((votingType) => {
    describe(`Voting type: ${votingType}`, async () => {
      describe('validateRegisterVoting', () => {
        if (votingType === 'election') {
          it('an election must have more than 1 candidate', async () => {
            await expect(
              validateRegisterVoting({
                votingDescription: {
                  'en-US': 'Test election',
                },
                votingType,
                startedBy: startedBy.voterId,
                candidates: [candidates[0]],
                startsAt: nowDate,
                endsAt: tomorrowDate,
              })
            ).to.be.rejectedWith(/Election must have at least \d+ candidates/)
          })
        }
      })
      describe('registerVoting', () => {
        it('should start a voting', async () => {
          const persistVotingSpy = chai.spy(() =>
            Promise.resolve({
              inserts: 1,
            })
          )
          const checkActiveVotersSpy = chai.spy(() =>
            Promise.resolve(
              isCandidateBasedVotingType(votingType)
                ? {
                    ...allVotersIds.reduce((acc, candidate) => {
                      acc[candidate] = true
                      return acc
                    }, {}),
                  }
                : { [startedBy.voterId]: true }
            )
          )
          const countActiveVotersSpy = chai.spy(() => Promise.resolve(totalVoters))

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
              startedBy: startedBy.voterId,
              ...(isCandidateBasedVotingType(votingType) && { candidates }),
              endsAt: tomorrowDate,
              ...(votingType === 'election' ? { onlyOneSelected: 1 } : { evidences: [] }),
            },
          })
          const { voting: responseVoting } = response

          expect(persistVotingSpy).to.have.been.called.once
          expect(persistVotingSpy).to.have.been.called.with(responseVoting)
          if (isCandidateBasedVotingType(votingType)) {
            expect(checkActiveVotersSpy).to.have.been.called.twice
            expect(checkActiveVotersSpy).to.have.been.called.with(candidatesId)
            expect(checkActiveVotersSpy).to.have.been.called.with([startedBy.voterId])
          } else {
            expect(checkActiveVotersSpy).to.have.been.called.once
            expect(checkActiveVotersSpy).to.have.been.called.with([startedBy.voterId])
          }
          expect(countActiveVotersSpy).to.have.been.called.once
          expect(responseVoting.votingId).to.exist
          expect(responseVoting.startsAt).to.exist
          expect(responseVoting.totalVoters).to.equal(totalVoters)
        })

        if (isCandidateBasedVotingType(votingType))
          it('should have all voters registered', async () => {
            const [firstCandidate, ...others] = candidates
            const checkActiveVotersSpy = chai.spy(() =>
              Promise.resolve({
                [startedBy.voterId]: false,
                [firstCandidate.candidateId]: false,
                ...others.reduce((acc, { candidateId }) => {
                  acc[candidateId] = true
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
                  startedBy: startedBy.voterId,
                  candidates,
                  endsAt: tomorrowDate,
                  ...(votingType === 'election' ? { onlyOneSelected: 1 } : { evidences: [] }),
                },
              })
            ).to.be.rejectedWith(`Voter(s) ${firstCandidate.candidateId} do not exist`)
            expect(checkActiveVotersSpy).to.have.been.called.once
          })
      })
    })
  })
  it('a voting cannot be too short', async () => {
    await expect(
      validateRegisterVoting({
        votingDescription: {
          'en-US': 'Test voting',
        },
        votingType: 'election',
        startedBy: startedBy.voterId,
        candidates,
        startsAt: nowDate,
        endsAt: new Date(nowDate.getTime() + MIN_VOTING_DURATION - 1),
      })
    ).to.be.rejectedWith('Voting duration is too short')
  })

  it('a voting cannot be too long', async () => {
    await expect(
      validateRegisterVoting({
        votingDescription: {
          'en-US': 'Test voting',
        },
        votingType: 'election',
        startedBy: startedBy.voterId,
        candidates,
        startsAt: nowDate,
        endsAt: new Date(nowDate.getTime() + MAX_VOTING_DURATION + 1),
      })
    ).to.be.rejectedWith('Voting duration is too long')
  })

  it('a voting cannot end before it starts', async () => {
    await expect(
      validateRegisterVoting({
        votingDescription: {
          'en-US': 'Test voting',
        },
        votingType: 'election',
        startedBy: startedBy.voterId,
        candidates,
        startsAt: tomorrowDate,
        endsAt: new Date(tomorrowDate.getTime() - 1),
      })
    ).to.be.rejectedWith(`Voting cannot end before it starts`)
  })

  it('a voting cannot be started by a candidate', async () => {
    await expect(
      validateRegisterVoting({
        votingDescription: {
          'en-US': 'Test election',
        },
        votingType: 'election',
        startedBy: startedBy.voterId,
        candidates: [{ candidateId: startedBy.voterId }, ...candidates],
        startsAt: nowDate,
        endsAt: tomorrowDate,
      })
    ).to.be.rejectedWith('Voting cannot be started by a candidate')
  })

  it('candidate based voting without candidates (undefined)', async () => {
    await expect(
      validateRegisterVoting({
        votingDescription: {
          'en-US': 'Test election',
        },
        votingType: 'election',
        startedBy: startedBy.voterId,
        startsAt: nowDate,
        endsAt: tomorrowDate,
      })
    ).to.be.rejectedWith('Voting has no candidates')
  })

  it('candidate based voting without candidates (empty)', async () => {
    await expect(
      validateRegisterVoting({
        votingDescription: {
          'en-US': 'Test election',
        },
        votingType: 'election',
        startedBy: startedBy.voterId,
        startsAt: nowDate,
        endsAt: tomorrowDate,
        candidates: [],
      })
    ).to.be.rejectedWith('Voting has no candidates')
  })
})
