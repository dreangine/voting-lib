import { expect } from 'chai'
import * as chai from 'chai'
import * as spies from 'chai-spies'
import * as chaiPromised from 'chai-as-promised'

import { UserInfo } from '../src/types'

import { DEFAULT_CALLBACKS } from '../src/common'
import { setCallbacks } from '../src/index'
import { registerVoters } from '../src/voter'
import { getUsers } from './common'

chai.use(spies)
chai.use(chaiPromised)

// Setup
const users: UserInfo[] = getUsers()

beforeEach(async () => {
  // Reset callbacks
  setCallbacks(DEFAULT_CALLBACKS)
})

describe('Voter', () => {
  it('should add voters', async () => {
    const persistVotersSpy = chai.spy(() =>
      Promise.resolve({
        inserts: users.length,
      })
    )

    setCallbacks({
      persistVoters: persistVotersSpy,
    })

    const response = await registerVoters({
      users,
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
        inserts: users.length,
      })
    )

    setCallbacks({
      persistVoters: persistVotersSpy,
    })

    const response = await registerVoters({
      users,
      omitReturnedData: true,
    })

    expect(persistVotersSpy).to.have.been.called.once
    expect(response.voters).to.be.undefined
  })
})
