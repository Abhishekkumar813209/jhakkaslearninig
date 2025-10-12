import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvoiceData {
  studentName: string;
  studentEmail: string;
  studentId: string;
  orderId: string;
  paymentId: string;
  originalAmount: number;
  creditsApplied: number;
  finalAmount: number;
  currency: string;
  paymentDate: string;
  validityDays: number;
  startDate: string;
  endDate: string;
  planName: string;
  isTestMode: boolean;
}

function generateInvoiceHTML(data: InvoiceData): string {
  const invoiceNumber = `INV-${data.orderId.replace('order_', '')}`;
  const formattedDate = new Date(data.paymentDate).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
  const validFrom = new Date(data.startDate).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
  const validUntil = new Date(data.endDate).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
    .container { max-width: 650px; margin: 30px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
    .test-badge { background: #ff6b6b; color: white; display: inline-block; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; margin-top: 10px; }
    .content { padding: 30px; }
    .invoice-meta { display: flex; justify-content: space-between; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #f0f0f0; }
    .invoice-meta div { }
    .invoice-meta strong { display: block; color: #666; font-size: 12px; text-transform: uppercase; margin-bottom: 5px; }
    .invoice-meta span { font-size: 16px; font-weight: 600; color: #333; }
    .student-details { background: #f8f9fa; padding: 20px; border-radius: 6px; margin-bottom: 25px; }
    .student-details h3 { margin: 0 0 12px 0; font-size: 14px; color: #666; text-transform: uppercase; }
    .student-details p { margin: 5px 0; font-size: 15px; }
    .payment-table { width: 100%; border-collapse: collapse; margin: 25px 0; }
    .payment-table th { background: #f8f9fa; padding: 12px; text-align: left; font-size: 13px; font-weight: 600; color: #666; border-bottom: 2px solid #e0e0e0; }
    .payment-table td { padding: 12px; border-bottom: 1px solid #f0f0f0; font-size: 14px; }
    .payment-table tr:last-child td { border-bottom: none; }
    .payment-table .total-row { background: #f8f9fa; font-weight: 600; font-size: 16px; }
    .payment-table .total-row td { border-top: 2px solid #667eea; padding: 15px 12px; }
    .subscription-box { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 6px; margin: 25px 0; }
    .subscription-box h3 { margin: 0 0 15px 0; font-size: 18px; font-weight: 600; }
    .subscription-box .validity { display: flex; justify-content: space-between; margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.2); }
    .subscription-box .validity div { }
    .subscription-box .validity strong { display: block; font-size: 11px; opacity: 0.8; margin-bottom: 4px; }
    .subscription-box .validity span { font-size: 15px; font-weight: 600; }
    .footer { background: #f8f9fa; padding: 20px 30px; text-align: center; font-size: 13px; color: #666; }
    .footer p { margin: 8px 0; }
    .success-badge { color: #10b981; font-weight: 600; }
    .amount { color: #667eea; font-weight: 600; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Payment Invoice</h1>
      ${data.isTestMode ? '<div class="test-badge">TEST MODE</div>' : ''}
    </div>
    
    <div class="content">
      <div class="invoice-meta">
        <div>
          <strong>Invoice Number</strong>
          <span>${invoiceNumber}</span>
        </div>
        <div>
          <strong>Invoice Date</strong>
          <span>${formattedDate}</span>
        </div>
      </div>

      <div class="student-details">
        <h3>Bill To</h3>
        <p><strong>${data.studentName}</strong></p>
        <p>${data.studentEmail}</p>
        <p style="font-size: 12px; color: #999;">Student ID: ${data.studentId.substring(0, 8)}</p>
      </div>

      <table class="payment-table">
        <thead>
          <tr>
            <th>Description</th>
            <th style="text-align: right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Monthly Premium Access<br><small style="color: #999;">${data.planName}</small></td>
            <td style="text-align: right;">₹${data.originalAmount.toFixed(2)}</td>
          </tr>
          ${data.creditsApplied > 0 ? `
          <tr>
            <td>Referral Credits Applied</td>
            <td style="text-align: right; color: #10b981;">-₹${data.creditsApplied.toFixed(2)}</td>
          </tr>
          ` : ''}
          <tr class="total-row">
            <td><strong>Total Paid</strong></td>
            <td style="text-align: right;"><strong class="amount">₹${data.finalAmount.toFixed(2)}</strong></td>
          </tr>
        </tbody>
      </table>

      <div style="margin: 20px 0; padding: 15px; background: #f0fdf4; border-left: 4px solid #10b981; border-radius: 4px;">
        <p style="margin: 0; font-size: 14px;"><strong class="success-badge">✓ Payment Successful</strong></p>
        <p style="margin: 5px 0 0 0; font-size: 12px; color: #666;">Payment ID: ${data.paymentId}</p>
        <p style="margin: 2px 0 0 0; font-size: 12px; color: #666;">Order ID: ${data.orderId}</p>
      </div>

      <div class="subscription-box">
        <h3>Subscription Details</h3>
        <p style="margin: 5px 0; font-size: 14px; opacity: 0.9;">✓ Full Access to Test Series</p>
        <p style="margin: 5px 0; font-size: 14px; opacity: 0.9;">✓ Unlimited Practice Questions</p>
        <p style="margin: 5px 0; font-size: 14px; opacity: 0.9;">✓ Detailed Performance Analytics</p>
        <p style="margin: 5px 0; font-size: 14px; opacity: 0.9;">✓ Learning Path Guidance</p>
        
        <div class="validity">
          <div>
            <strong>VALID FROM</strong>
            <span>${validFrom}</span>
          </div>
          <div style="text-align: right;">
            <strong>VALID UNTIL</strong>
            <span>${validUntil}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="footer">
      <p><strong>Thank you for your subscription!</strong></p>
      <p>For support, contact us at support@example.com</p>
      <p style="margin-top: 15px; font-size: 11px; color: #999;">This is an auto-generated invoice. No signature required.</p>
    </div>
  </div>
</body>
</html>
  `;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const invoiceData: InvoiceData = await req.json();
    
    console.log('[send-payment-invoice] Generating invoice for:', invoiceData.studentEmail);

    const htmlContent = generateInvoiceHTML(invoiceData);

    const emailResult = await resend.emails.send({
      from: "Learning Platform <onboarding@resend.dev>",
      to: [invoiceData.studentEmail],
      subject: `Payment Invoice - ${invoiceData.orderId}`,
      html: htmlContent,
    });

    if (emailResult.error) {
      console.error('[send-payment-invoice] Resend error:', emailResult.error);
      return new Response(
        JSON.stringify({ error: "Failed to send invoice email", details: emailResult.error }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log('[send-payment-invoice] Invoice sent successfully. Email ID:', emailResult.data?.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Invoice sent successfully",
        emailId: emailResult.data?.id 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error('[send-payment-invoice] Error:', error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
