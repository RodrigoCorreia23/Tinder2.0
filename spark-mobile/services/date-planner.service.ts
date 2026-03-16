import api from './api';
import { DatePlan } from '@/types';

interface TimeSlot {
  day: string;
  timeFrom: string;
  timeTo: string;
}

export async function setAvailability(matchId: string, slots: TimeSlot[]) {
  const res = await api.post(`/date-plans/matches/${matchId}/availability`, { slots });
  return res.data;
}

export async function getAvailability(matchId: string) {
  const res = await api.get(`/date-plans/matches/${matchId}/availability`);
  return res.data as { mine: TimeSlot[] | null; theirs: boolean; bothSet: boolean };
}

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
