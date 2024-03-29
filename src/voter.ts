import { generateVoterId, persistVoters } from './common'
import { RegisterVotersRequest, RegisterVotersResponse, VoterData } from './types'

export async function registerVoters(
  request: RegisterVotersRequest
): Promise<RegisterVotersResponse> {
  const { users, omitReturnedData } = request
  const now = new Date()
  const voters = await Promise.all(
    users.map(
      async ({ userId, alias }) =>
        ({
          voterId: generateVoterId(),
          userId,
          alias,
          status: 'active',
          createdAt: now,
          updatedAt: now,
        } as VoterData)
    )
  )
  await persistVoters(voters)
  return { voters: omitReturnedData ? undefined : voters }
}
