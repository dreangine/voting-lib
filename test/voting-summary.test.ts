import { expect } from 'chai'
import * as chai from 'chai'
import * as spies from 'chai-spies'
import * as chaiPromised from 'chai-as-promised'

import {
  VoteData,
  VotingData,
  VotingId,
  RetrieveResponse,
  RetrieveVotingSummaryResponse,
} from '../src/types'

import { DEFAULT_CALLBACKS, generateVotingId, setCallbacks } from '../src/common'
import { retrieveVotingSummary } from '../src/voting-summary'

import { getScenarios, votingTypes } from './common'

chai.use(spies)
chai.use(chaiPromised)

// Setup
let generatedVotingId: VotingId

beforeEach(async () => {
  // Reset callbacks
  setCallbacks(DEFAULT_CALLBACKS)
  generatedVotingId = generateVotingId()
})

describe('Voting summary', () => {
  votingTypes.forEach((votingType) => {
    describe(`Voting type: ${votingType}`, () => {
      getScenarios(votingType).forEach((scenario) => {
        it(scenario.description, async () => {
          const { votingId } = scenario.voting

          const retrieveVotingSpy = chai.spy(() =>
            Promise.resolve({
              data: scenario.voting,
            } as RetrieveResponse<VotingData>)
          )
          const retrieveVotesSpy = chai.spy(() =>
            Promise.resolve({
              data: scenario.votes,
            } as RetrieveResponse<VoteData[]>)
          )

          setCallbacks({
            retrieveVoting: retrieveVotingSpy,
            retrieveVotes: retrieveVotesSpy,
          })

          const result = await retrieveVotingSummary({
            votingId,
          })
          expect(retrieveVotingSpy).to.have.been.called.once
          expect(retrieveVotingSpy).to.have.been.called.with(votingId)
          expect(retrieveVotesSpy).to.have.been.called.once
          expect(retrieveVotesSpy).to.have.been.called.with(votingId)
          expect(result).to.exist
          expect(result).to.deep.equal({
            voting: scenario.voting,
            ...scenario.expected,
          } as RetrieveVotingSummaryResponse)
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
