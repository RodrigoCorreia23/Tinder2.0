import openai from '../../config/openai';

interface DateSuggestionInput {
  user1Name: string;
  user2Name: string;
  commonInterests: string[];
  user1Interests: string[];
  user2Interests: string[];
  preferredDay?: string;
  preferredTime?: string;
}

interface DateSuggestion {
  activity: string;
  venueName: string;
  venueAddress: string;
  reasoning: string;
}

export async function generateAIDatePlan(input: DateSuggestionInput): Promise<DateSuggestion> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      temperature: 0.8,
      max_tokens: 300,
      messages: [
        {
          role: 'system',
          content: `You are a creative date planner for a dating app called Spark.
Generate fun, creative and realistic date suggestions based on the users' shared interests.
Always respond in JSON format with these exact fields:
{
  "activity": "A short, catchy name for the date activity",
  "venueName": "A realistic type of venue (e.g., 'Cozy café in the old town')",
  "venueAddress": "A general area description (e.g., 'Downtown area')",
  "reasoning": "A short, warm explanation of why this date is perfect for both (max 2 sentences)"
}
Keep it casual and fun. Make the reasoning feel personal.`
        },
        {
          role: 'user',
          content: `Plan a date for two people:
- Person 1 interests: ${input.user1Interests.join(', ')}
- Person 2 interests: ${input.user2Interests.join(', ')}
- Common interests: ${input.commonInterests.length > 0 ? input.commonInterests.join(', ') : 'none yet'}
${input.preferredDay ? `- Preferred day: ${input.preferredDay}` : ''}
${input.preferredTime ? `- Preferred time: around ${input.preferredTime}` : ''}

Suggest something creative that connects to their shared interests.`
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('No response from AI');

    return JSON.parse(content) as DateSuggestion;
  } catch (err) {
    console.error('[AI] Date plan generation failed:', err);
    // Fallback to a generic suggestion
    return {
      activity: 'Coffee & conversation',
      venueName: 'A cozy local café',
      venueAddress: 'City center',
      reasoning: 'A relaxed first meet to discover what you have in common.',
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
