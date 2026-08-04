import { Request, Response } from 'express';
import { DlpPolicy } from '../models/DlpPolicy';
import { User } from '../models/User';

export class PolicyController {
  /**
   * Agent heartbeat / policy sync endpoint.
   * Agent sends its userId and current policy version.
   * Returns POLICY_UPDATED with new payload if out‑of‑date.
   */
  public static async syncAgentPolicy(req: Request, res: Response): Promise<Response> {
    try {
      const { userId, agentPolicyVersion } = req.body as { userId?: string; agentPolicyVersion?: number };

      if (!userId) {
        return res.status(400).json({ error: 'INVALID_REQUEST', message: 'userId is required.' });
      }

      // Find active user
      const user = await User.findOne({ userId, status: 'ACTIVE' });
      if (!user) {
        return res.status(404).json({ error: 'USER_NOT_FOUND', message: 'Active user not found.' });
      }

      // Find most recent active policy for user's department or role
      const activePolicy = await DlpPolicy.findOne({
        isActive: true,
        assignedUserGroups: { $in: [user.department, user.role] },
      }).sort({ updatedAt: -1 });

      if (!activePolicy) {
        return res.status(404).json({ error: 'POLICY_NOT_FOUND', message: 'No active policy for user.' });
      }

      if (agentPolicyVersion && agentPolicyVersion === activePolicy.version) {
        return res.status(200).json({ status: 'IN_SYNC', version: activePolicy.version });
      }

      return res.status(200).json({
        status: 'POLICY_UPDATED',
        version: activePolicy.version,
        policyId: activePolicy.policyId,
        enforcements: activePolicy.enforcements,
        syncedAt: new Date(),
      });
    } catch (err) {
      console.error('Policy sync error:', err);
      return res.status(500).json({ error: 'INTERNAL_SERVER_ERROR', message: 'Policy sync failed.' });
    }
  }

  /**
   * Admin endpoint to create or update a DLP policy.
   */
  public static async upsertPolicy(req: Request, res: Response): Promise<Response> {
    try {
      const { policyId, name, enforcements, assignedUserGroups } = req.body as {
        policyId: string;
        name: string;
        enforcements: any;
        assignedUserGroups: string[];
      };

      const updated = await DlpPolicy.findOneAndUpdate(
        { policyId },
        {
          $set: { name, enforcements, assignedUserGroups, isActive: true },
          $inc: { version: 1 },
        },
        { new: true, upsert: true }
      );

      return res.status(200).json({ message: 'Policy upserted', policy: updated });
    } catch (err) {
      console.error('Policy upsert error:', err);
      return res.status(500).json({ error: 'POLICY_UPSERT_FAILED', message: (err as any).message });
    }
  }
}
