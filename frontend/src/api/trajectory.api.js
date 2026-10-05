import api from './axios';

/**
 * trajectory.api.js
 * API calls for the Longitudinal Recovery Trajectory.
 */
export const trajectoryApi = {
  // Get recovery trajectory for a client (therapist)
  getTrajectory: (clientId) =>
    api.get(`/trajectory/${clientId}`),
};
