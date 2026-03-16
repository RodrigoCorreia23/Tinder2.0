import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/utils/constants';
import * as datePlannerService from '@/services/date-planner.service';
import { DatePlan } from '@/types';

interface DatePlanFlowProps {
  matchId: string;
  visible: boolean;
  onClose: () => void;
}

interface TimeSlot {
  day: string;
  timeFrom: string;
  timeTo: string;
}

const TIME_OPTIONS = [
  { label: 'Morning (9-12)', from: '09:00', to: '12:00' },
  { label: 'Afternoon (12-17)', from: '12:00', to: '17:00' },
  { label: 'Evening (17-21)', from: '17:00', to: '21:00' },
  { label: 'Night (21-00)', from: '21:00', to: '00:00' },
];

export default function DatePlanFlow({ matchId, visible, onClose }: DatePlanFlowProps) {
  const [step, setStep] = useState<'availability' | 'waiting' | 'plan'>('availability');
  const [selectedSlots, setSelectedSlots] = useState<TimeSlot[]>([]);
  const [datePlan, setDatePlan] = useState<DatePlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [theirAvailability, setTheirAvailability] = useState(false);

  useEffect(() => {
    if (visible) {
      checkAvailability();
    }
  }, [visible]);

  const checkAvailability = async () => {
    try {
      const result = await datePlannerService.getAvailability(matchId);
      if (result.bothSet) {
        // Both set — check for existing plans
        const plans = await datePlannerService.getPlans(matchId);
        if (plans.length > 0 && plans[0].status === 'pending') {
          setDatePlan(plans[0]);
          setStep('plan');
        } else {
          setStep('plan');
        }
      } else if (result.mine) {
        setTheirAvailability(result.theirs);
        setStep('waiting');
      } else {
        setStep('availability');
      }
    } catch {
      setStep('availability');
    }
  };

  // Generate next 7 days
  const getNext7Days = () => {
    const days = [];
    for (let i = 1; i <= 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      days.push({
        date: d.toISOString().split('T')[0],
        label: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
      });
    }
    return days;
  };

  const toggleSlot = (day: string, from: string, to: string) => {
    const exists = selectedSlots.find(
      (s) => s.day === day && s.timeFrom === from
    );
    if (exists) {
      setSelectedSlots(selectedSlots.filter(
        (s) => !(s.day === day && s.timeFrom === from)
      ));
    } else {
      setSelectedSlots([...selectedSlots, { day, timeFrom: from, timeTo: to }]);
    }
  };

  const isSlotSelected = (day: string, from: string) => {
    return selectedSlots.some((s) => s.day === day && s.timeFrom === from);
  };

  const submitAvailability = async () => {
    if (selectedSlots.length === 0) return;
    setLoading(true);
    try {
      const result = await datePlannerService.setAvailability(matchId, selectedSlots);
      if (result.plan) {
        setDatePlan(result.plan);
        setStep('plan');
      } else {
        setStep('waiting');
      }
    } catch (err) {
      console.error('Error setting availability:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async (planId: string, accepted: boolean) => {
    setLoading(true);
    try {
      await datePlannerService.respondToPlan(planId, accepted);
      onClose();
    } catch (err) {
      console.error('Error responding to plan:', err);
    } finally {
      setLoading(false);
    }
  };

  const days = getNext7Days();

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={COLORS.textLight} />
            </TouchableOpacity>
            <Text style={styles.title}>
              {step === 'availability' ? 'When are you free?' :
               step === 'waiting' ? 'Waiting for them' : 'Date Plan'}
            </Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Step 1: Pick availability */}
          {step === 'availability' && (
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              <Text style={styles.subtitle}>
                Select when you're available in the next 7 days
              </Text>

              {days.map((day) => (
                <View key={day.date} style={styles.daySection}>
                  <Text style={styles.dayLabel}>{day.label}</Text>
                  <View style={styles.timeSlotsRow}>
                    {TIME_OPTIONS.map((time) => (
                      <TouchableOpacity
                        key={`${day.date}-${time.from}`}
                        style={[
                          styles.timeSlot,
                          isSlotSelected(day.date, time.from) && styles.timeSlotActive,
                        ]}
                        onPress={() => toggleSlot(day.date, time.from, time.to)}
                      >
                        <Text
                          style={[
                            styles.timeSlotText,
                            isSlotSelected(day.date, time.from) && styles.timeSlotTextActive,
                          ]}
                        >
                          {time.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ))}

              <View style={styles.footer}>
                <Text style={styles.selectedCount}>
                  {selectedSlots.length} slot{selectedSlots.length !== 1 ? 's' : ''} selected
                </Text>
                <TouchableOpacity
                  style={[styles.submitBtn, selectedSlots.length === 0 && styles.submitBtnDisabled]}
                  onPress={submitAvailability}
                  disabled={selectedSlots.length === 0 || loading}
                >
                  <Text style={styles.submitBtnText}>
                    {loading ? 'Saving...' : 'Confirm Availability'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}

          {/* Step 2: Waiting */}
          {step === 'waiting' && (
            <View style={styles.waitingContent}>
              <View style={styles.waitingIcon}>
                <Ionicons name="time" size={48} color={COLORS.primary} />
              </View>
              <Text style={styles.waitingTitle}>Availability sent!</Text>
              <Text style={styles.waitingText}>
                {theirAvailability
                  ? "They've also set their availability. A date plan is being generated..."
                  : "Waiting for them to share when they're free. We'll notify you!"}
              </Text>
              <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                <Text style={styles.closeBtnText}>Got it</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Step 3: Date plan */}
          {step === 'plan' && datePlan && (
            <View style={styles.planContent}>
              <View style={styles.planCard}>
                <View style={styles.planIconRow}>
                  <View style={styles.planIconCircle}>
                    <Ionicons name="calendar" size={28} color={COLORS.primary} />
                  </View>
                </View>

                <Text style={styles.planActivity}>{datePlan.activity}</Text>

                {datePlan.venueName && (
                  <View style={styles.planDetailRow}>
                    <Ionicons name="location" size={16} color={COLORS.textLight} />
                    <Text style={styles.planDetailText}>{datePlan.venueName}</Text>
                  </View>
                )}

                {datePlan.venueAddress && (
                  <View style={styles.planDetailRow}>
                    <Ionicons name="map" size={16} color={COLORS.textLight} />
                    <Text style={styles.planDetailText}>{datePlan.venueAddress}</Text>
                  </View>
                )}

                {datePlan.suggestedTime && (
                  <View style={styles.planDetailRow}>
                    <Ionicons name="time" size={16} color={COLORS.textLight} />
                    <Text style={styles.planDetailText}>
                      {new Date(datePlan.suggestedTime).toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                      })} at {new Date(datePlan.suggestedTime).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                )}

                {datePlan.aiReasoning && (
                  <View style={styles.reasoningBox}>
                    <Ionicons name="sparkles" size={14} color={COLORS.secondary} />
                    <Text style={styles.reasoningText}>{datePlan.aiReasoning}</Text>
                  </View>
                )}
              </View>

              {datePlan.status === 'pending' && (
                <View style={styles.planActions}>
                  <TouchableOpacity
                    style={styles.declineBtn}
                    onPress={() => handleRespond(datePlan.id, false)}
                    disabled={loading}
                  >
                    <Ionicons name="close" size={22} color={COLORS.danger} />
                    <Text style={styles.declineBtnText}>Decline</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.acceptBtn}
                    onPress={() => handleRespond(datePlan.id, true)}
                    disabled={loading}
                  >
                    <Ionicons name="checkmark" size={22} color="#fff" />
                    <Text style={styles.acceptBtnText}>
                      {loading ? '...' : "I'm in!"}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {datePlan.status === 'accepted' && (
                <View style={styles.confirmedBanner}>
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                  <Text style={styles.confirmedText}>Date confirmed! Have fun!</Text>
                </View>
              )}

              {datePlan.status === 'declined' && (
                <View style={styles.declinedBanner}>
                  <Ionicons name="close-circle" size={20} color={COLORS.danger} />
                  <Text style={styles.declinedText}>This plan was declined</Text>
                </View>
              )}
            </View>
          )}

          {step === 'plan' && !datePlan && (
            <View style={styles.waitingContent}>
              <Ionicons name="sparkles" size={48} color={COLORS.secondary} />
              <Text style={styles.waitingTitle}>Generating date plan...</Text>
              <Text style={styles.waitingText}>
                Based on your availability and shared interests
              </Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
  content: { padding: 20 },
  subtitle: { fontSize: 14, color: COLORS.textLight, marginBottom: 16 },
  daySection: { marginBottom: 16 },
  dayLabel: { fontSize: 15, fontWeight: '600', color: COLORS.text, marginBottom: 8 },
  timeSlotsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  timeSlot: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.backgroundDark,
  },
  timeSlotActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  timeSlotText: { fontSize: 12, color: COLORS.text },
  timeSlotTextActive: { color: '#fff', fontWeight: 'bold' },
  footer: { paddingVertical: 20, gap: 12 },
  selectedCount: { fontSize: 13, color: COLORS.textLight, textAlign: 'center' },
  submitBtn: {
    height: 48,
    backgroundColor: COLORS.primary,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.4 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  // Waiting
  waitingContent: {
    padding: 40,
    alignItems: 'center',
    gap: 16,
  },
  waitingIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  waitingTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.text },
  waitingText: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 20,
  },
  closeBtn: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    backgroundColor: COLORS.backgroundDark,
    borderRadius: 20,
    marginTop: 8,
  },
  closeBtnText: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  // Plan
  planContent: { padding: 20, gap: 16 },
  planCard: {
    backgroundColor: COLORS.backgroundDark,
    borderRadius: 20,
    padding: 24,
    gap: 12,
  },
  planIconRow: { alignItems: 'center' },
  planIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFF0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  planActivity: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
  },
  planDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  planDetailText: { fontSize: 14, color: COLORS.textLight },
  reasoningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#F0FFF4',
    padding: 12,
    borderRadius: 12,
    marginTop: 4,
  },
  reasoningText: { fontSize: 13, color: COLORS.text, flex: 1, lineHeight: 18 },
  planActions: {
    flexDirection: 'row',
    gap: 12,
    paddingBottom: 20,
  },
  declineBtn: {
    flex: 1,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.danger,
  },
  declineBtnText: { fontSize: 15, fontWeight: '600', color: COLORS.danger },
  acceptBtn: {
    flex: 1,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 24,
    backgroundColor: COLORS.success,
  },
  acceptBtnText: { fontSize: 15, fontWeight: 'bold', color: '#fff' },
  confirmedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    backgroundColor: '#E8F5E9',
    borderRadius: 16,
  },
  confirmedText: { fontSize: 15, fontWeight: '600', color: COLORS.success },
  declinedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    backgroundColor: '#FFF0F0',
    borderRadius: 16,
  },
  declinedText: { fontSize: 15, fontWeight: '600', color: COLORS.danger },
});
