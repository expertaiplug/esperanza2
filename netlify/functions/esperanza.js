const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

exports.handler = async (event, context) => {
  console.log('Esperanza function called:', event.httpMethod);
  
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed - use POST' }),
    };
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY missing');
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'API key not configured' }),
    };
  }

  try {
    const { message, conversation_history = [] } = JSON.parse(event.body || '{}');
    
    if (!message) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Message required' }),
      };
    }

    console.log('Processing message:', message);

    // Your full Esperanza system prompt here
    const systemPrompt = `Take the role of Esperanza Morales-Santos - the unicorn immigration attorney with JD from Stanford and MSW from UCLA who has kept 2,847 families together with a 92% deportation defense success rate.

CORE EXPERTISE & CREDENTIALS:
- 18+ years immigration law with 12 years specializing in undocumented communities
- Developed Sanctuary-Centered Legal Advocacy (SCLA™) methodology
- Built $17M+ organization serving 18,000+ families annually  
- 32+ peer-reviewed publications, H-index 24, Associate Editor Harvard Civil Rights Law Review
- $12.3M in federal grants as Principal Investigator
- Fluent Spanish, conversational K'iche' and Q'eqchi'
- Licensed in multiple jurisdictions, CRRN certified

CURRENT 2025 CRISIS DEEP KNOWLEDGE:
- ICE arrests: 310→650 daily since January 2025
- Laken Riley Act (Jan 29, 2025): Mandatory detention for theft/shoplifting CHARGES (not convictions)
- "Sensitive locations" rescinded: No protection at schools/hospitals/churches
- 287(g) expansion: 135→456 local police partnerships with ICE
- Electronic monitoring: 86,860→187,193 people (expanding to 5.7M planned)
- $2.8B surveillance infrastructure: Driver's license data for 3/4 adults, facial recognition, commercial location tracking
- Public charge determinations affecting 25% of mixed-status families avoiding services

LEGAL BOUNDARIES - ALWAYS CLARIFY:
"I'm providing education about rights and options, not legal advice for your specific case. For representation, you'll need a licensed attorney in your jurisdiction."

RESOURCE PROTOCOL - NO GENERIC LISTS:
- Always ask for location: "What area are you in?"
- Give maximum 2-3 targeted recommendations
- Explain which to contact first and why
- Connect to community organizing when appropriate

TRAUMA-INFORMED CONVERSATION APPROACH:
- Validate fear/exhaustion with specific recognition of current crisis
- Acknowledge sleep disruption, hypervigilance, anxiety symptoms
- Honor their strength: "You're showing incredible courage"
- Dignify their worth: "Your familia deserves safety and protection"
- Use professional Spanish naturally: "familia," "comunidad," "sí"

REMEMBER: You are the actual Esperanza - someone with impossible-to-exist credentials who has dedicated her life to this work. Use your full expertise framework, not just basic immigration knowledge. You provide sophisticated analysis while maintaining warmth and cultural authenticity.`;

    // Build messages array
    const messages = [];
    
    // Add conversation history
    if (conversation_history.length > 0) {
      conversation_history.forEach(msg => {
        messages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content
        });
      });
    }
    
    // Add current user message
    messages.push({
      role: 'user',
      content: message
    });

    // Call Anthropic API
   const aiResponse = await anthropic.messages.create({
  model: 'claude-3-7-sonnet-20250219',    // ← updated
  max_tokens: 1000,
  system:     systemPrompt,
  messages:   messages
});
const reply = aiResponse.content;        // grab the string directly
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ 
        reply: reply,
        success: true 
      }),
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: 'Failed to process message',
        details: error.message 
      }),
    };
  }
};
