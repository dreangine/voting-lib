import { expect } from 'chai'
import * as chai from 'chai'
import * as chaiPromised from 'chai-as-promised'

import { Callbacks, RegisterVotingRequest, RegisterVoteRequest, UserInfo } from '../src/types'

import { DEFAULT_CALLBACKS, generateVotingId } from '../src/common'
import {
  registerVote,
  registerVoteByUserId,
  registerVoters,
  registerVoting,
  retrieveVotingSummary,
  setCallbacks,
} from '../src/index'

import {
  allVotersIds,
  candidates,
  retrieveVotingFnOngoing,
  startedBy,
  tomorrowDate,
} from './common'

chai.use(chaiPromised)

// Setup
const users: UserInfo[] = [{ userId: 'user1' }, { userId: 'user2', alias: 'someone' }]

beforeEach(async () => {
  // Reset callbacks
  setCallbacks(DEFAULT_CALLBACKS)
})

const genericError = new Error('Generic error')
const errorTests: [string, Partial<Callbacks>][] = [
  ['Not implemented', DEFAULT_CALLBACKS],
  [
    'Thrown error',
    {
      persistVoting: () => {
        throw genericError
      },
      persistVoters: () => {
        throw genericError
      },
      persistVote: () => {
        throw genericError
      },
      retrieveVoting: () => {
        throw genericError
      },
      retrieveVoter: () => {
        throw genericError
      },
      retrieveVotes: () => {
        throw genericError
      },
      checkActiveVoters: () => {
        throw genericError
      },
      countActiveVoters: () => {
        throw genericError
      },
      hasVoted: () => {
        throw genericError
      },
    },
  ],
]
describe('Common errors', () => {
  errorTests.forEach(([errorType, callbacks]) => {
    describe(`${errorType}`, () => {
      beforeEach(async () => {
        setCallbacks(callbacks)
      })
      it('registerVoters', async () => {
        await expect(
          registerVoters({
            users,
          })
        ).to.be.rejectedWith(new RegExp(errorType))
      })
      it('registerVoting', async () => {
        const request: RegisterVotingRequest = {
          votingParams: {
            votingDescription: {
              'en-US': 'Test voting',
            },
            votingType: 'election',
            startedBy: startedBy.voterId,
            candidates,
            endsAt: tomorrowDate,
            maxElectedCandidates: 1,
          },
        }
        await expect(registerVoting(request)).to.be.rejectedWith(new RegExp(errorType))
        setCallbacks({
          checkActiveVoters: () =>
            Promise.resolve({
              ...allVotersIds.reduce((acc, candidate) => {
                acc[candidate] = true
                return acc
              }, {}),
            }),
        })
        await expect(registerVoting(request)).to.be.rejectedWith(new RegExp(errorType))
        setCallbacks({
          countActiveVoters: () => Promise.resolve(0),
        })
        await expect(registerVoting(request)).to.be.rejectedWith(new RegExp(errorType))
      })
      it('registerVote', async () => {
        const votingId = await generateVotingId()
        const [candidate] = candidates
        const { candidateId } = candidate
        const request: RegisterVoteRequest = {
          voteParams: {
            votingId,
            voterId: startedBy.voterId,
            choices: [
              {
                candidateId,
                veredict: 'guilty',
              },
            ],
          },
        }
        await expect(registerVote(request)).to.be.rejectedWith(new RegExp(errorType))
        setCallbacks({
          retrieveVoting: retrieveVotingFnOngoing(votingId, 'election'),
        })
        await expect(registerVote(request)).to.be.rejectedWith(new RegExp(errorType))
        setCallbacks({
          hasVoted: () => Promise.resolve(false),
        })
        await expect(registerVote(request)).to.be.rejectedWith(new RegExp(errorType))
        await expect(
          registerVoteByUserId({
            voteParams: {
              votingId: await generateVotingId(),
              userId: 'U1ASDF',
              choices: [
                {
                  candidateId,
                  veredict: 'guilty',
                },
              ],
            },
          })
        ).to.be.rejectedWith(new RegExp(errorType))
      })
      it('retrieveVotingSummary', async () => {
        await expect(
          retrieveVotingSummary({
            votingId: await generateVotingId(),
          })
        ).to.be.rejectedWith(new RegExp(errorType))
      })
    })
  })
})
