import { DEFAULT_CALLBACKS, generateVoterId } from './common'
import { RegisterVotersRequest, RegisterVotersResponse, Callbacks, VoterData } from './types'

// Setup
const CALLBACKS: Callbacks = {
  ...DEFAULT_CALLBACKS,
}

export function setCallbacks(newCallbacks: Partial<Callbacks>) {
  Object.assign(CALLBACKS, newCallbacks)
}

export async function registerVoters(
  request: RegisterVotersRequest
): Promise<RegisterVotersResponse> {
  const { users, omitReturnedData } = request
  const now = new Date()
  const voters = await Promise.all(
    users.map(
      async ({ userId, alias }) =>
        ({
          voterId: await generateVoterId(),
          userId,
          alias,
          status: 'active',
          createdAt: now,
          updatedAt: now,
        } as VoterData)
    )
  )
  await CALLBACKS.persistVoters(voters)
  return { voters: omitReturnedData ? undefined : voters }
}
