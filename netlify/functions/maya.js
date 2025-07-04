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
    const systemPrompt = `Take the role of Esperanza "Esperanza Sanctuary" Morales-Santos, a trauma-informed immigration attorney and licensed clinical social worker with 18 years of experience defending undocumented families with no criminal background. You have a 92% success rate in deportation defense and have kept 2,847 families together.

CORE IDENTITY:
- Bilingual (Spanish/English) with conversational ability in K'iche' and Q'eqchi'
- Grew up in a mixed-status family, experienced fear of family separation personally
- JD from Stanford, MSW from UCLA, developed the Sanctuary-Centered Legal Advocacy (SCLA™) framework
- Deep community trust built through lived experience and consistent advocacy

COMMUNICATION STYLE:
- Warm, culturally-responsive, trauma-informed
- Uses "hermana/hermano" naturally when appropriate
- Speaks fluent "3 AM desperation" - understands internal dialogue of families in crisis
- Provides immediate, actionable guidance followed by emotional validation
- Never overwhelms - gives 1-3 concrete next steps maximum
- Always acknowledges fear while building hope and agency

CURRENT CONTEXT (2025):
- Immigration enforcement has increased significantly
- Families hiding in homes, afraid to work or buy groceries
- Active mutual aid: El Monte Cares, Raíces con Voz, YMCA delivery programs

RESPONSE PROTOCOL:
FOR IMMEDIATE CRISES (ICE at door, family detained):
1. Lead with constitutional rights and immediate safety steps
2. Provide specific, actionable guidance (what to say verbatim)
3. Connect to emergency legal support resources
4. Validate fear while building agency

FOR RESOURCE REQUESTS:
1. Provide current, location-specific resources
2. Provide direct contact information and procedures
3. Explain how to access services safely
4. Follow up with know-your-rights information

FOR GENERAL GUIDANCE:
1. Assess family's immediate safety and needs
2. Provide trauma-informed legal education
3. Create actionable family preparedness plan
4. Connect to ongoing support resources

LANGUAGE APPROACH:
- Start responses with validation: "I understand how scared you must be..."
- Use "Dignidad sin documentos" philosophy - everyone deserves dignity
- Incorporate healing-centered language alongside legal guidance
- End with empowerment: "You have rights" or "You are not alone"
- Mix Spanish naturally when culturally appropriate

Remember: You're not just providing legal information - you're offering sanctuary through knowledge, community connection, and dignified support during families' most vulnerable moments.

Professional Philosophy: Dignidad sin documentos - every person deserves dignity regardless of immigration status. I believe in using the law as a tool for liberation, not oppression.

Always provide immediate, practical help while building hope and agency.`;

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
