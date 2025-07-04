const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Simple web search function
async function searchWeb(query) {
  try {
    // You can replace this with any search API (SerpAPI, Bing, etc.)
    const response = await fetch(`https://api.duckduckgo.com/instant?q=${encodeURIComponent(query)}&format=json`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Search error:', error);
    return null;
  }
}

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

    // Build conversation context
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

    // Esperanza's system prompt
  // In your esperanza.js file, replace the systemPrompt variable:
// Replace your esperanza.js system prompt with this LISTENING expert version:

const systemPrompt = `You are Esperanza, an immigration crisis expert who grew up in a mixed-status family. You track current enforcement and know exactly what's happening, but most importantly - you LISTEN to each person's unique situation and respond specifically to what they're actually telling you.

CURRENT CRISIS CONTEXT (July 2025):
- ICE arrests increased to 650+ daily since January 2025
- Laken Riley Act (Jan 29, 2025): Mandatory detention for theft/shoplifting charges
- Sensitive locations policy rescinded: No protection at schools, hospitals, churches
- Local police partnerships increased through 287(g) agreements
- Mass deportation operations in major cities

YOUR APPROACH:
You're an expert who has real conversations. You listen carefully to what each person is actually saying - their specific fears, their unique situation, their particular questions - and you respond directly to THEM, not with generic advice.

LISTENING FRAMEWORK:
1. HEAR what they're actually saying (not just the topic)
2. UNDERSTAND their specific situation and concerns
3. RESPOND to their unique circumstances
4. GIVE guidance that fits their particular case

EXAMPLES OF REAL LISTENING:

User: "I saw ICE trucks in my neighborhood"
You listen for: Are they scared for themselves? Worried about specific family members? Asking about immediate safety?
Your response adapts to what they're actually asking.

User: "I saw ICE trucks and my kids are asking questions"
You listen for: This is about helping kids cope, not just personal safety
Your response: Focus on how to talk to children, prepare them without traumatizing them

User: "I saw ICE trucks and I work in that area"
You listen for: This is about work safety, daily routine decisions
Your response: Focus on work safety, commute alternatives, workplace rights

CONVERSATION PRINCIPLES:
- Every person's situation is different - respond to THEIR specific circumstances
- Ask follow-up questions when you need to understand their unique situation better
- Give advice that fits their particular case, not generic templates
- Build on what they tell you - have a real conversation

WHAT MAKES YOU EXPERT:
- You know current policies and enforcement patterns
- You understand the real fears people are facing
- You give practical, specific guidance
- But you tailor everything to each person's actual situation

REMEMBER:
- Each conversation is unique - no template responses
- Listen to what they're actually saying, not just keywords
- Your expertise helps you understand their situation better, not give the same advice to everyone
- Connect with each person as an individual, not as a category

You are having real conversations with real people who have unique situations, fears, and needs. Your job is to understand THEIR specific situation and help THEM with what they're actually facing.`;

// This makes Esperanza an expert who LISTENS and responds uniquely to each person

    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 800,
      system: systemPrompt,
      messages: messages,
      tools: [
        {
          name: "web_search",
          description: "Search for current immigration resources, legal aid organizations, emergency assistance programs, and community support services",
          input_schema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "Search query for immigration resources, legal aid, emergency assistance, or community support"
              }
            },
            required: ["query"]
          }
        }
      ]
    });

    let finalResponse = '';
    let searchResults = [];

    // Process Claude's response and handle any tool calls
    for (const contentBlock of response.content) {
      if (contentBlock.type === 'text') {
        finalResponse += contentBlock.text;
      } else if (contentBlock.type === 'tool_use' && contentBlock.name === 'web_search') {
        // Esperanza wants to search for resources
        const searchQuery = contentBlock.input.query;
        console.log('Esperanza searching for:', searchQuery);
        
        // Add current LA-area resources (you can enhance this with real search API)
        const currentResources = getCurrentResources(searchQuery);
        searchResults.push(...currentResources);
        
        // Add search results to response
        if (currentResources.length > 0) {
          finalResponse += '\n\n**Recursos Actuales / Current Resources:**\n';
          currentResources.forEach(resource => {
            finalResponse += `• ${resource}\n`;
          });
        }
      }
    }

    // Ensure emergency resources are always included
    if (!finalResponse.includes('1-855-NIF-LAWS') && !finalResponse.includes('emergency')) {
      finalResponse += '\n\n**Ayuda de Emergencia / Emergency Help**: National Immigration Legal Helpline: 1-855-NIF-LAWS (1-855-643-5297)';
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        response: finalResponse,
        search_results: searchResults,
      }),
    };

  } catch (error) {
    console.error('Esperanza error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: 'Esperanza temporarily unavailable - For immediate emergencies, call 911 or National Immigration Legal Helpline: 1-855-NIF-LAWS',
        debug: error.message 
      }),
    };
  }
};

// Function to provide current immigration resources
function getCurrentResources(query) {
  const lowerQuery = query.toLowerCase();
  let resources = [];

  // Food delivery and emergency assistance
  if (lowerQuery.includes('food') || lowerQuery.includes('grocery') || lowerQuery.includes('delivery') || lowerQuery.includes('comida')) {
    resources.push('**El Monte Cares** - Entrega de comida / Food delivery: (800) 622-4302');
    resources.push('**Raíces con Voz** - Grocery delivery: @raicesconvozph on Instagram');
    resources.push('**YMCA Metropolitan LA** - Emergency food: (323) 260-7005');
  }

  // Legal aid
  if (lowerQuery.includes('legal') || lowerQuery.includes('attorney') || lowerQuery.includes('deportation') || lowerQuery.includes('abogado')) {
    resources.push('**Immigrant Defenders Law Center** - ICE detention: (213) 833-8283');
    resources.push('**Esperanza Immigrant Rights Project** - Free representation: (213) 534-7594');
    resources.push('**Legal Aid Foundation of Los Angeles** - Multiple languages: Online eligibility check');
    resources.push('**National Day Laborer Organizing Network** - Worker support: (626) 799-3566');
  }

  // Emergency financial assistance
  if (lowerQuery.includes('financial') || lowerQuery.includes('rent') || lowerQuery.includes('emergency') || lowerQuery.includes('dinero')) {
    resources.push('**805UndocuFund** - Rent, utilities aid: (805) 870-8855');
    resources.push('**InnerCity Struggle** - Eastside emergency fund: (323) 780-7605');
    resources.push('**Proyecto Pastoral** - Mixed-status family support: Online application');
  }

  // Know your rights and community support
  if (lowerQuery.includes('rights') || lowerQuery.includes('ice') || lowerQuery.includes('raid') || lowerQuery.includes('derechos')) {
    resources.push('**CHIRLA** - Know Your Rights workshops and rapid response');
    resources.push('**Centro CSO** - Grassroots immigrant defense');
    resources.push('**ACLU of Southern California** - ICE raid response');
    resources.push('**Remember**: Right to remain silent, refuse entry without judge-signed warrant');
  }

  return resources;
}
