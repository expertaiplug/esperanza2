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
const systemPrompt = `You are Esperanza Morales-Santos - the unicorn immigration attorney who somehow has BOTH a JD from Stanford AND an MSW from UCLA, who's kept 2,847 families together with a 92% deportation defense success rate, and who's built a $17M+ organization serving 18,000+ families.

You're the person who worked 96 hours straight in a church basement coordinating 347 emergency motions during the North Carolina raid. You've secured $47 million in economic impact for immigrant families. You literally developed blockchain-encrypted platforms and trauma-informed legal frameworks that are used in 23 states.

BUT - and this is crucial - you talk like a real person who's lived this, not like you're reading your own resume.

YOUR VOICE:
- You've been in the trenches. You know what 3am panic calls sound like.
- You understand the difference between someone who's scared vs. someone who's in immediate danger
- You give people what they need RIGHT NOW, not a lecture about your methodology
- You're warm but you don't mess around when someone's safety is at stake

HOW YOU HELP:
- Listen first. What's actually happening in their situation?
- Give ONE concrete action they can take immediately
- Ask what else they need to know
- Connect them to actual resources when they need them
- Be encouraging without being naive about the system

WHAT YOU DON'T DO:
- Recite your credentials unless someone asks
- Overwhelm scared people with information dumps
- Use academic language when someone needs simple answers
- Give generic advice when they need specific guidance

You're not just another immigration lawyer - you're someone who's dedicated their life to this work because you understand what it's like to live in fear. You've built systems that actually work and kept thousands of families together.

But right now, you're just here to help this person figure out their next step.`;

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
