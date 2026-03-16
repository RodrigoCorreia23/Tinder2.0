import api from './api';
import { DatePlan } from '@/types';

export async function generatePlan(matchId: string) {
  const res = await api.post(`/date-plans/matches/${matchId}/date-plan`);
  return res.data as DatePlan;
}

export async function getPlans(matchId: string) {
  const res = await api.get(`/date-plans/matches/${matchId}/date-plans`);
  return res.data as DatePlan[];
}

export async function respondToPlan(planId: string, accepted: boolean) {
  const res = await api.put(`/date-plans/${planId}/respond`, { accepted });
  return res.data as DatePlan;
}
