// Edge Function to send reports via messages system only

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
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const adminEmail = Deno.env.get('ADMIN_EMAIL') || 'admin@vendra.com';
    
    console.log('Environment variables:', { adminEmail });
    
    // Create Supabase client with service role key for admin operations
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get admin user ID
    const { data: adminUser, error: adminError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', adminEmail)
      .single();
    
    if (adminError || !adminUser) {
      console.error('Admin user not found:', adminError);
      // Try to find any user with admin-like role as fallback
      const { data: fallbackAdmin, error: fallbackError } = await supabaseAdmin
        .from('users')
        .select('id')
        .or('email.like.%@admin.com,email.like.%@vendra.com')
        .limit(1)
        .single();
      
      if (fallbackError || !fallbackAdmin) {
        console.error('No fallback admin user found');
        return new Response(
          JSON.stringify({ 
            message: 'Report received but admin user not configured',
            details: 'Please contact system administrator to set up admin user',
            received: { title, category, userEmail, userName }
          }),
          { headers: { "Content-Type": "application/json", ...corsHeaders }, status: 200 }
        );
      } else {
        console.log('Using fallback admin user:', fallbackAdmin.id);
        // Continue with fallback admin
        await sendReportMessage(supabaseAdmin, fallbackAdmin.id, { title, description, category, userEmail, userName, userId });
        return new Response(
          JSON.stringify({ 
            message: 'Report received and sent to fallback admin via messages',
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
      }
    }
    
    // Send message to admin with report details
    await sendReportMessage(supabaseAdmin, adminUser.id, { title, description, category, userEmail, userName, userId });
    
    console.log('Message sent to admin successfully');
    
    return new Response(
      JSON.stringify({ 
        message: 'Report received and sent to admin via messages',
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

// Helper function to send report message - ALTERNATIVE APPROACH
// Instead of trying to reopen conversations, we create a new report that overrides closed status
async function sendReportMessage(supabaseAdmin: any, adminId: string, reportData: any) {
  const { title, description, category, userEmail, userName, userId } = reportData;

  console.log('Creating new report message with case reopening power:', { userId, adminId });

  // Check if there are any closed conversations first (for logging)
  const { data: existingClosed, error: checkError } = await supabaseAdmin
    .from('messages')
    .select('id')
    .or(`and(sender_id.eq.${userId},recipient_id.eq.${adminId}),and(sender_id.eq.${adminId},recipient_id.eq.${userId})`)
    .eq('conversation_type', 'user_to_admin')
    .eq('case_status', 'closed')
    .limit(1);

  const hasClosedConversations = !checkError && existingClosed && existingClosed.length > 0;

  const messageContent = `
🆕 NUEVO REPORTE RECIBIDO 🆕
Usuario: ${userName} (${userEmail})
Categoría: ${category}
Título: ${title}
Descripción: ${description}

${hasClosedConversations ? '⚡ ¡CASO REACTIVADO! Este reporte ha reactivado conversaciones cerradas previas.' : '📋 Nuevo reporte enviado al administrador.'}

🔄 Para continuar la conversación, utiliza el sistema de mensajes normalmente.
  `;

  console.log('Inserting report with special content...');

  // Insert the report message with a special marker that indicates it should reopen cases
  const { data, error: insertError } = await supabaseAdmin
    .from('messages')
    .insert({
      sender_id: userId,
      recipient_id: adminId,
      content: messageContent,
      conversation_type: 'user_to_admin',
      case_status: 'open' // This message itself has open status
    })
    .select('id, created_at')
    .single();

  if (insertError) {
    console.error('Failed to insert report message:', insertError);

    // Try with explicit timestamps
    const { error: timestampError } = await supabaseAdmin
      .from('messages')
      .insert({
        sender_id: userId,
        recipient_id: adminId,
        content: `[MENSAJE DE RESPALDO] ${userName}: ${title}`,
        conversation_type: 'user_to_admin',
        case_status: 'open',
        created_at: new Date().toISOString(),
        read_at: null
      });

    if (timestampError) {
      console.error('Even fallback insertion failed:', timestampError);
      throw new Error(`Complete failure to create report message: ${timestampError.message}`);
    } else {
      console.log('✅ Fallback report insertion successful');
      return;
    }
  }

  console.log('✅ Report message created successfully:', data?.id);

  // AFTER successful insertion, attempt to reopen previous closed conversations
  // This happens after the report is already sent, so it won't affect the report insertion
  if (hasClosedConversations) {
    console.log('🆙 Attempting to reopen previous closed conversations...');

    const { error: reopenError } = await supabaseAdmin
      .from('messages')
      .update({
        case_status: 'open',
        reopened_at: new Date().toISOString()
      })
      .or(`and(sender_id.eq.${userId},recipient_id.eq.${adminId}),and(sender_id.eq.${adminId},recipient_id.eq.${userId})`)
      .eq('conversation_type', 'user_to_admin')
      .eq('case_status', 'closed');

    if (reopenError) {
      console.warn('Could not reopen closed conversations, but report was sent:', reopenError);
    } else {
      console.log('✅ Successfully reopened previous closed conversations');
    }
  }
}
