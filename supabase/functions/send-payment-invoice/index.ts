import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "npm:resend@2.0.0";
import { PDFDocument, rgb, StandardFonts } from "npm:pdf-lib@1.17.1";

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
  basePrice?: number;
  displayPrice?: number;
  friendDiscount?: number;
  promoDiscount?: number;
  friendReferralCode?: string;
  promoCode?: string;
}

async function generateInvoicePDF(data: InvoiceData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4 size
  const { width, height } = page.getSize();
  
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  const invoiceNumber = `INV-${data.orderId.replace('order_', '')}`;
  const formattedDate = new Date(data.paymentDate).toLocaleDateString('en-IN');
  const validFrom = new Date(data.startDate).toLocaleDateString('en-IN');
  const validUntil = new Date(data.endDate).toLocaleDateString('en-IN');
  
  let yPos = height - 60;
  
  // Header
  page.drawRectangle({
    x: 0,
    y: yPos - 50,
    width: width,
    height: 80,
    color: rgb(0.4, 0.49, 0.92),
  });
  
  page.drawText('PAYMENT INVOICE', {
    x: 50,
    y: yPos - 15,
    size: 24,
    font: boldFont,
    color: rgb(1, 1, 1),
  });
  
  if (data.isTestMode) {
    page.drawText('TEST MODE', {
      x: width - 150,
      y: yPos - 15,
      size: 12,
      font: boldFont,
      color: rgb(1, 0.42, 0.42),
    });
  }
  
  yPos -= 100;
  
  // Invoice meta
  page.drawText('Invoice Number:', { x: 50, y: yPos, size: 10, font: font, color: rgb(0.4, 0.4, 0.4) });
  page.drawText(invoiceNumber, { x: 50, y: yPos - 15, size: 12, font: boldFont });
  
  page.drawText('Invoice Date:', { x: width - 200, y: yPos, size: 10, font: font, color: rgb(0.4, 0.4, 0.4) });
  page.drawText(formattedDate, { x: width - 200, y: yPos - 15, size: 12, font: boldFont });
  
  yPos -= 50;
  
  // Student details
  page.drawRectangle({
    x: 40,
    y: yPos - 60,
    width: width - 80,
    height: 70,
    color: rgb(0.97, 0.97, 0.98),
  });
  
  page.drawText('BILL TO', { x: 50, y: yPos - 15, size: 10, font: boldFont, color: rgb(0.4, 0.4, 0.4) });
  page.drawText(data.studentName, { x: 50, y: yPos - 32, size: 12, font: boldFont });
  page.drawText(data.studentEmail, { x: 50, y: yPos - 47, size: 10, font: font });
  page.drawText(`Student ID: ${data.studentId.substring(0, 8)}`, { x: 50, y: yPos - 60, size: 8, font: font, color: rgb(0.6, 0.6, 0.6) });
  
  yPos -= 90;
  
  // Payment table header
  page.drawRectangle({
    x: 40,
    y: yPos - 25,
    width: width - 80,
    height: 25,
    color: rgb(0.97, 0.97, 0.98),
  });
  
  page.drawText('Description', { x: 50, y: yPos - 18, size: 11, font: boldFont });
  page.drawText('Amount', { x: width - 130, y: yPos - 18, size: 11, font: boldFont });
  
  yPos -= 35;
  
  // Line items
  page.drawText('Monthly Premium Access', { x: 50, y: yPos, size: 10, font: font });
  page.drawText(data.planName, { x: 50, y: yPos - 12, size: 8, font: font, color: rgb(0.6, 0.6, 0.6) });
  page.drawText(`₹${(data.basePrice || data.originalAmount).toFixed(2)}`, { x: width - 130, y: yPos, size: 10, font: font });
  
  yPos -= 30;
  
  // Display price discount (if different from base)
  if (data.displayPrice && data.basePrice && data.displayPrice < data.basePrice) {
    const displayDiscount = data.basePrice - data.displayPrice;
    page.drawText('Special Offer Discount', { x: 50, y: yPos, size: 10, font: font });
    page.drawText(`-₹${displayDiscount.toFixed(2)}`, { x: width - 130, y: yPos, size: 10, font: font, color: rgb(0.06, 0.72, 0.51) });
    yPos -= 25;
  }
  
  // Friend referral discount
  if (data.friendDiscount && data.friendDiscount > 0) {
    page.drawText(`Friend Referral Discount (${data.friendReferralCode || ''})`, { x: 50, y: yPos, size: 10, font: font });
    page.drawText(`-₹${data.friendDiscount.toFixed(2)}`, { x: width - 130, y: yPos, size: 10, font: font, color: rgb(0.06, 0.72, 0.51) });
    yPos -= 25;
  }
  
  // Promo code discount
  if (data.promoDiscount && data.promoDiscount > 0) {
    page.drawText(`Promo Code Discount (${data.promoCode || ''})`, { x: 50, y: yPos, size: 10, font: font });
    page.drawText(`-₹${data.promoDiscount.toFixed(2)}`, { x: width - 130, y: yPos, size: 10, font: font, color: rgb(0.06, 0.72, 0.51) });
    yPos -= 25;
  }
  
  // Wallet credits
  if (data.creditsApplied > 0) {
    page.drawText('Wallet Credits Applied', { x: 50, y: yPos, size: 10, font: font });
    page.drawText(`-₹${data.creditsApplied.toFixed(2)}`, { x: width - 130, y: yPos, size: 10, font: font, color: rgb(0.06, 0.72, 0.51) });
    yPos -= 25;
  }
  
  yPos -= 10;
  
  // Total
  page.drawRectangle({
    x: 40,
    y: yPos - 25,
    width: width - 80,
    height: 30,
    color: rgb(0.97, 0.97, 0.98),
  });
  
  page.drawText('TOTAL PAID', { x: 50, y: yPos - 18, size: 12, font: boldFont });
  page.drawText(`₹${data.finalAmount.toFixed(2)}`, { x: width - 130, y: yPos - 18, size: 14, font: boldFont, color: rgb(0.4, 0.49, 0.92) });
  
  yPos -= 50;
  
  // Payment success box
  page.drawRectangle({
    x: 40,
    y: yPos - 50,
    width: width - 80,
    height: 55,
    color: rgb(0.94, 0.99, 0.96),
  });
  
  page.drawText('✓ Payment Successful', { x: 50, y: yPos - 18, size: 11, font: boldFont, color: rgb(0.06, 0.72, 0.51) });
  page.drawText(`Payment ID: ${data.paymentId}`, { x: 50, y: yPos - 32, size: 8, font: font, color: rgb(0.4, 0.4, 0.4) });
  page.drawText(`Order ID: ${data.orderId}`, { x: 50, y: yPos - 43, size: 8, font: font, color: rgb(0.4, 0.4, 0.4) });
  
  yPos -= 80;
  
  // Subscription details
  page.drawRectangle({
    x: 40,
    y: yPos - 100,
    width: width - 80,
    height: 110,
    color: rgb(0.4, 0.49, 0.92),
  });
  
  page.drawText('SUBSCRIPTION DETAILS', { x: 50, y: yPos - 20, size: 12, font: boldFont, color: rgb(1, 1, 1) });
  page.drawText('✓ Full Access to Test Series', { x: 50, y: yPos - 40, size: 9, font: font, color: rgb(1, 1, 1) });
  page.drawText('✓ Unlimited Practice Questions', { x: 50, y: yPos - 55, size: 9, font: font, color: rgb(1, 1, 1) });
  page.drawText('✓ Detailed Performance Analytics', { x: 50, y: yPos - 70, size: 9, font: font, color: rgb(1, 1, 1) });
  page.drawText('✓ Learning Path Guidance', { x: 50, y: yPos - 85, size: 9, font: font, color: rgb(1, 1, 1) });
  
  // Validity dates
  page.drawText('VALID FROM', { x: 50, y: yPos - 100, size: 8, font: font, color: rgb(0.9, 0.9, 0.9) });
  page.drawText(validFrom, { x: 50, y: yPos - 112, size: 10, font: boldFont, color: rgb(1, 1, 1) });
  
  page.drawText('VALID UNTIL', { x: width - 200, y: yPos - 100, size: 8, font: font, color: rgb(0.9, 0.9, 0.9) });
  page.drawText(validUntil, { x: width - 200, y: yPos - 112, size: 10, font: boldFont, color: rgb(1, 1, 1) });
  
  // Footer
  yPos = 80;
  page.drawText('Thank you for your subscription!', { x: width / 2 - 90, y: yPos, size: 10, font: boldFont, color: rgb(0.2, 0.2, 0.2) });
  page.drawText('For support, contact us at support@jhakkaslearning.com', { x: width / 2 - 130, y: yPos - 15, size: 8, font: font, color: rgb(0.4, 0.4, 0.4) });
  page.drawText('This is an auto-generated invoice. No signature required.', { x: width / 2 - 120, y: yPos - 30, size: 7, font: font, color: rgb(0.6, 0.6, 0.6) });
  
  return await pdfDoc.save();
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
            <td style="text-align: right;">₹${(data.originalAmount || data.basePrice || data.displayPrice || 0).toFixed(2)}</td>
          </tr>
          ${data.displayPrice && data.basePrice && data.displayPrice < data.basePrice ? `
          <tr>
            <td>Special Offer Discount</td>
            <td style="text-align: right; color: #10b981;">-₹${(data.basePrice - data.displayPrice).toFixed(2)}</td>
          </tr>
          ` : ''}
          ${data.friendDiscount && data.friendDiscount > 0 ? `
          <tr>
            <td>Friend Referral Discount ${data.friendReferralCode ? `(${data.friendReferralCode})` : ''}</td>
            <td style="text-align: right; color: #10b981;">-₹${data.friendDiscount.toFixed(2)}</td>
          </tr>
          ` : ''}
          ${data.promoDiscount && data.promoDiscount > 0 ? `
          <tr>
            <td>Promo Code Discount ${data.promoCode ? `(${data.promoCode})` : ''}</td>
            <td style="text-align: right; color: #10b981;">-₹${data.promoDiscount.toFixed(2)}</td>
          </tr>
          ` : ''}
          ${data.creditsApplied > 0 ? `
          <tr>
            <td>Wallet Credits Applied</td>
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
      <p>For support, contact us at support@jhakkaslearning.com</p>
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
    
    console.log('[send-payment-invoice] Request received');
    console.log('[send-payment-invoice] Student email:', invoiceData.studentEmail);
    console.log('[send-payment-invoice] Order ID:', invoiceData.orderId);

    // Check if RESEND_API_KEY is configured
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      console.error('[send-payment-invoice] RESEND_API_KEY not configured!');
      throw new Error('Email service not configured');
    }

    // Validate email address
    if (!invoiceData.studentEmail || !invoiceData.studentEmail.includes('@')) {
      console.error('[send-payment-invoice] Invalid email:', invoiceData.studentEmail);
      throw new Error('Invalid recipient email address');
    }

    console.log('[send-payment-invoice] Generating invoice HTML...');
    const htmlContent = generateInvoiceHTML(invoiceData);

    console.log('[send-payment-invoice] Generating PDF invoice...');
    const pdfBytes = await generateInvoicePDF(invoiceData);
    const pdfBase64 = btoa(String.fromCharCode(...pdfBytes));

    console.log('[send-payment-invoice] Sending email via Resend with PDF attachment...');
    const emailResult = await resend.emails.send({
      from: "Jhakkas Learning <noreply@jhakkaslearning.com>",
      to: [invoiceData.studentEmail],
      subject: `Payment Invoice - ${invoiceData.orderId}`,
      html: htmlContent,
      attachments: [
        {
          filename: `Invoice-${invoiceData.orderId}.pdf`,
          content: pdfBase64,
        }
      ],
    });

    if (emailResult.error) {
      console.error('[send-payment-invoice] Resend error:', JSON.stringify(emailResult.error));
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
