import { expect } from 'chai'
import * as chai from 'chai'
import * as spies from 'chai-spies'

import { RegisterVoteParams, RegisterVotersParams, StartVotingParams } from '../src/types'

import { registerVote, registerVoters, startVoting } from '../src/index'

chai.use(spies)

describe('Add voters', () => {
  it('should add voters', () => {
    const spy = chai.spy(() => Promise.resolve())
    const registerVotersParams: RegisterVotersParams = {
      persistVoters: spy,
      userIds: ['U1ASDF', 'U2ASDF'],
    }
    const result = registerVoters(registerVotersParams)

    expect(spy).to.have.been.called.once
    expect(spy).to.have.been.called.with(result)
    result.forEach((voter) => {
      expect(voter.voterId).to.exist
    })
  })
})

describe('Start election', () => {
  it('should start an election', () => {
    const spy = chai.spy(() => Promise.resolve())
    const startVotingParams: StartVotingParams = {
      persistVoting: spy,
      votingParams: {
        votingDescriptionId: 'VD1ASDF',
        startedBy: 'V1ASDF',
        targetedAt: ['V1ASDF', 'V2ASDF'],
        endsAt: new Date(),
      },
    }

    const result = startVoting(startVotingParams)

    expect(spy).to.have.been.called.once
    expect(spy).to.have.been.called.with(result)
    expect(result.votingId).to.exist
    expect(result.startedAt).to.exist
  })
})

describe('Add a vote', () => {
  it('should add a vote', () => {
    const spy = chai.spy(() => Promise.resolve())
    const registerVoteParams: RegisterVoteParams = {
      persistVote: spy,
      voteParams: {
        votingId: 'V1ASDF',
        voterId: 'V1ASDF',
        vote: 'yes',
        targetId: 'V2ASDF',
      },
    }

    const result = registerVote(registerVoteParams)

    expect(spy).to.have.been.called.once
    expect(spy).to.have.been.called.with(result)
    expect(result.voteId).to.exist
    expect(result.createdAt).to.exist
  })
})
