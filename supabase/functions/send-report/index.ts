// Edge Function to send reports via HTTP request to a webhook

console.log("Send report function started");

Deno.serve(async (req) => {
  // Add CORS headers for all requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400'
      },
      status: 204
    });
  }

  // Add CORS headers to the response
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  try {
    // Log the incoming request for debugging
    console.log('Received request:', {
      method: req.method,
      url: req.url,
      headers: Object.fromEntries(req.headers.entries())
    });
    
    // Check if it's a POST request
    if (req.method !== "POST") {
      console.log('Method not allowed:', req.method);
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { headers: { "Content-Type": "application/json", ...corsHeaders }, status: 405 }
      );
    }

    // Check if content-type is JSON
    const contentType = req.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.log('Invalid content type:', contentType);
      return new Response(
        JSON.stringify({ error: "Content-Type must be application/json" }),
        { headers: { "Content-Type": "application/json", ...corsHeaders }, status: 400 }
      );
    }

    // Get the request body
    let body;
    try {
      body = await req.json();
      console.log('Parsed request body:', body);
    } catch (parseError: any) {
      console.error('Failed to parse request body:', parseError);
      return new Response(
        JSON.stringify({ error: "Invalid JSON in request body", details: parseError.message }),
        { headers: { "Content-Type": "application/json", ...corsHeaders }, status: 400 }
      );
    }

    // Validate required fields
    const { title, description, category, userEmail, userName, userId } = body;
    
    if (!title || !description || !category || !userEmail || !userName || !userId) {
      console.error('Missing required fields:', { title, description, category, userEmail, userName, userId });
      return new Response(
        JSON.stringify({ 
          error: "Missing required fields", 
          received: { title: !!title, description: !!description, category: !!category, userEmail: !!userEmail, userName: !!userName, userId: !!userId },
          details: { title, category, userEmail, userName }
        }),
        { headers: { "Content-Type": "application/json", ...corsHeaders }, status: 400 }
      );
    }
    
    console.log('Processing report:', { title, category, userEmail, userName });
    
    // Get environment variables
    const webhookUrl = Deno.env.get('REPORTS_WEBHOOK_URL');
    const adminEmail = Deno.env.get('ADMIN_EMAIL') || 'admin@vendra.com';
    
    console.log('Environment variables:', { webhookUrl: !!webhookUrl, adminEmail, hasResendKey: !!Deno.env.get('RESEND_API_KEY') });
    
    // If webhook URL is configured, send to webhook
    if (webhookUrl) {
      console.log('Sending to webhook:', webhookUrl);
      const webhookResponse = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          category,
          userEmail,
          userName,
          userId,
          adminEmail
        })
      });
      
      if (!webhookResponse.ok) {
        const errorText = await webhookResponse.text();
        console.error('Webhook error:', errorText);
        throw new Error(`Webhook failed with status ${webhookResponse.status}: ${errorText}`);
      }
      
      return new Response(
        JSON.stringify({ message: 'Report sent successfully via webhook' }),
        { 
          headers: { 
            "Content-Type": "application/json",
            ...corsHeaders
          }, 
          status: 200 
        }
      );
    }
    
    // Fallback: Send email using Resend if API key is available
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (resendApiKey) {
      console.log('Sending via Resend to:', adminEmail);
      const emailData = {
        from: 'reports@vendra.com',
        to: adminEmail,
        subject: `[Vendra Report] ${category}: ${title}`,
        html: `
          <h2>Nuevo Reporte</h2>
          <p><strong>Usuario:</strong> ${userName} (${userEmail})</p>
          <p><strong>ID de Usuario:</strong> ${userId}</p>
          <p><strong>Categoría:</strong> ${category}</p>
          <p><strong>Título:</strong> ${title}</p>
          <p><strong>Descripción:</strong></p>
          <p>${description}</p>
        `
      };
      
      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${resendApiKey}`
        },
        body: JSON.stringify(emailData)
      });
      
      if (!emailResponse.ok) {
        const errorText = await emailResponse.text();
        console.error('Resend API error:', errorText);
        throw new Error(`Failed to send email: ${emailResponse.status} - ${errorText}`);
      }
      
      const emailResult = await emailResponse.json();
      console.log('Email sent successfully:', emailResult);
      
      return new Response(
        JSON.stringify({ message: 'Report sent successfully via email', email: emailResult }),
        { 
          headers: { 
            "Content-Type": "application/json",
            ...corsHeaders
          }, 
          status: 200 
        }
      );
    }
    
    // If no webhook or Resend API key, log the report
    console.log('Report logged (no webhook or email service configured):', {
      title,
      description,
      category,
      userEmail,
      userName,
      userId,
      adminEmail
    });
    
    return new Response(
      JSON.stringify({ 
        message: 'Report received but not sent (no service configured)', 
        received: { title, category, userEmail, userName }
      }),
      { 
        headers: { 
          "Content-Type": "application/json",
          ...corsHeaders
        }, 
        status: 200 
      }
    );
  } catch (error: any) {
    console.error('Error in send-report function:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message,
        stack: error.stack
      }),
      { 
        headers: { 
          "Content-Type": "application/json",
          ...corsHeaders
        }, 
        status: 500 
      }
    );
  }
});