import openai from '../../config/openai';

// ============================================
// SELFIE VERIFICATION
// ============================================

export async function verifySelfie(
  selfieUrl: string,
  profilePhotoUrls: string[]
): Promise<{ verified: boolean; confidence: string; reason: string }> {
  try {
    const imageMessages: Array<{ type: 'image_url'; image_url: { url: string } }> = [
      { type: 'image_url', image_url: { url: selfieUrl } },
      ...profilePhotoUrls.slice(0, 2).map((url) => ({
        type: 'image_url' as const,
        image_url: { url },
      })),
    ];

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      max_tokens: 300,
      messages: [
        {
          role: 'system',
          content:
            'You are a profile verification assistant. Compare the selfie (first image) with the profile photos (subsequent images). Determine if they appear to be the same person. Consider face shape, features, skin tone, and general appearance. Minor differences in lighting, angle, and accessories are acceptable. Respond in JSON: { "verified": boolean, "confidence": "high" | "medium" | "low", "reason": string }',
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'The first image is a selfie. The remaining images are profile photos. Are they the same person?' },
            ...imageMessages,
          ] as any,
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('No response from AI');

    return JSON.parse(content) as { verified: boolean; confidence: string; reason: string };
  } catch (err) {
    console.error('[AI] Selfie verification failed:', err);
    return {
      verified: false,
      confidence: 'low',
      reason: 'Verification service unavailable',
    };
  }
}

// ============================================
// DATE PLANNING
// ============================================

interface DateSuggestionInput {
  user1Name: string;
  user2Name: string;
  commonInterests: string[];
  user1Interests: string[];
  user2Interests: string[];
  preferredDay?: string;
  preferredTime?: string;
  user1Location?: { lat: number; lng: number } | null;
  user2Location?: { lat: number; lng: number } | null;
}

interface DateSuggestionOption {
  activity: string;
  venueName: string;
  venueAddress: string;
  reasoning: string;
}

interface DateSuggestion {
  options: DateSuggestionOption[];
}

export async function generateAIDatePlan(input: DateSuggestionInput): Promise<DateSuggestion> {
  try {
    // Calculate midpoint between the two users
    let locationContext = '';
    if (input.user1Location && input.user2Location) {
      const midLat = (input.user1Location.lat + input.user2Location.lat) / 2;
      const midLng = (input.user1Location.lng + input.user2Location.lng) / 2;
      locationContext = `
- Person 1 approximate location: lat ${input.user1Location.lat.toFixed(3)}, lng ${input.user1Location.lng.toFixed(3)}
- Person 2 approximate location: lat ${input.user2Location.lat.toFixed(3)}, lng ${input.user2Location.lng.toFixed(3)}
- Midpoint between them: lat ${midLat.toFixed(3)}, lng ${midLng.toFixed(3)}
IMPORTANT: Suggest venues that are roughly in the middle between both people, so it's fair for both to travel. Use the coordinates to suggest real, specific locations or neighborhoods near the midpoint.`;
    } else if (input.user1Location) {
      locationContext = `
- Person's approximate location: lat ${input.user1Location.lat.toFixed(3)}, lng ${input.user1Location.lng.toFixed(3)}
Suggest venues near this area.`;
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      temperature: 0.9,
      max_tokens: 600,
      messages: [
        {
          role: 'system',
          content: `You are a creative date planner for a dating app called Spark.
Generate exactly 3 fun, creative and realistic date suggestions based on the users' shared interests and locations.
Each suggestion should be a DIFFERENT type of activity at a DIFFERENT venue.
If you have location data, suggest REAL venues or specific neighborhoods near the midpoint between both users.
Always respond in JSON format:
{
  "options": [
    {
      "activity": "A short, catchy name for the date activity",
      "venueName": "A specific, realistic venue name or type",
      "venueAddress": "A specific neighborhood, street, or area near the midpoint",
      "reasoning": "A short, warm explanation of why this date is perfect for both (max 2 sentences)"
    },
    { ... },
    { ... }
  ]
}
Keep it casual and fun. Make each option distinct: one casual, one adventurous, one romantic.`
        },
        {
          role: 'user',
          content: `Plan a date for two people:
- Person 1 interests: ${input.user1Interests.join(', ')}
- Person 2 interests: ${input.user2Interests.join(', ')}
- Common interests: ${input.commonInterests.length > 0 ? input.commonInterests.join(', ') : 'none yet'}
${input.preferredDay ? `- Preferred day: ${input.preferredDay}` : ''}
${input.preferredTime ? `- Preferred time: around ${input.preferredTime}` : ''}
${locationContext}

Suggest 3 creative options that connect to their shared interests, ideally at locations roughly halfway between them.`
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('No response from AI');

    const parsed = JSON.parse(content) as DateSuggestion;
    if (parsed.options && parsed.options.length > 0) {
      return parsed;
    }
    throw new Error('Invalid response format');
  } catch (err) {
    console.error('[AI] Date plan generation failed:', err);
    return {
      options: [
        {
          activity: 'Coffee & conversation',
          venueName: 'A cozy local café',
          venueAddress: 'Halfway between you both',
          reasoning: 'A relaxed first meet to discover what you have in common.',
        },
        {
          activity: 'Walk in the park',
          venueName: 'Local park or garden',
          venueAddress: 'Near the city center',
          reasoning: 'Fresh air and relaxed vibes — perfect for getting to know each other.',
        },
        {
          activity: 'Dinner & drinks',
          venueName: 'A casual restaurant',
          venueAddress: 'City center',
          reasoning: 'Good food, good company — a classic first date.',
        },
      ],
    };
  }
}

export async function generateIceBreaker(
  commonInterests: string[],
  user1Interests: string[],
  user2Interests: string[]
): Promise<string[]> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      temperature: 0.9,
      max_tokens: 200,
      messages: [
        {
          role: 'system',
          content: `You are a friendly conversation starter for a dating app.
Generate 3 fun, casual ice breaker messages based on the users' interests.
Keep them short (max 15 words each), playful, and not cheesy.
Respond in JSON: { "iceBreakers": ["msg1", "msg2", "msg3"] }`
        },
        {
          role: 'user',
          content: `Generate ice breakers for someone whose match has these interests:
- Their interests: ${user2Interests.join(', ')}
- Common interests: ${commonInterests.length > 0 ? commonInterests.join(', ') : 'none yet'}
- My interests: ${user1Interests.join(', ')}`
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('No response');

    const parsed = JSON.parse(content);
    return parsed.iceBreakers || [];
  } catch (err) {
    console.error('[AI] Ice breaker generation failed:', err);
    return [
      'Hey! What got you into ' + (commonInterests[0] || 'this app') + '?',
      'If you could travel anywhere tomorrow, where would you go?',
      'What\'s the best thing that happened to you this week?',
    ];
  }
}
