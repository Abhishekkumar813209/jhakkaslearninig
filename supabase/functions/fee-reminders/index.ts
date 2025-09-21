import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const currentDate = new Date();
    const currentDay = currentDate.getDate();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    console.log(`Running fee reminders for date: ${currentDate.toISOString()}`);

    // Send reminders on 25th, 28th, and 30th of each month
    if (![25, 28, 30].includes(currentDay)) {
      return new Response(JSON.stringify({ 
        message: 'Reminders only sent on 25th, 28th, and 30th of month',
        date: currentDate.toISOString()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get all unpaid fee records for current month
    const { data: unpaidFees, error } = await supabase
      .from('fee_records')
      .select(`
        *,
        profiles!fee_records_student_id_fkey(full_name, email),
        parent_student_links!parent_student_links_student_id_fkey(
          parent_id,
          profiles!parent_student_links_parent_id_fkey(full_name, email)
        )
      `)
      .eq('month', currentMonth)
      .eq('year', currentYear)
      .eq('is_paid', false);

    if (error) {
      console.error('Error fetching unpaid fees:', error);
      throw error;
    }

    console.log(`Found ${unpaidFees?.length || 0} unpaid fee records`);

    let remindersSent = 0;
    const reminderType = currentDay === 25 ? 'first' : currentDay === 28 ? 'second' : 'final';

    for (const feeRecord of unpaidFees || []) {
      // Check if we already sent this type of reminder
      const { data: existingReminder } = await supabase
        .from('fee_reminders')
        .select('id')
        .eq('fee_record_id', feeRecord.id)
        .eq('reminder_type', reminderType)
        .single();

      if (existingReminder) {
        console.log(`Reminder already sent for student ${feeRecord.student_id}, type: ${reminderType}`);
        continue;
      }

      // Get parent email (or use student email if no parent linked)
      let parentEmail = feeRecord.profiles?.email;
      let parentName = feeRecord.profiles?.full_name;

      if (feeRecord.parent_student_links?.length > 0) {
        const primaryParent = feeRecord.parent_student_links.find(link => link.is_primary_contact) 
          || feeRecord.parent_student_links[0];
        
        if (primaryParent?.profiles) {
          parentEmail = primaryParent.profiles.email;
          parentName = primaryParent.profiles.full_name;
        }
      }

      if (!parentEmail) {
        console.log(`No email found for student ${feeRecord.student_id}`);
        continue;
      }

      // Generate strict, pushy email content
      const emailContent = generateReminderEmail(
        feeRecord.profiles?.full_name || 'Student',
        parentName || 'Parent',
        feeRecord.amount,
        feeRecord.due_date,
        feeRecord.battery_level,
        reminderType
      );

      try {
        const emailResponse = await resend.emails.send({
          from: "Coaching Institute <fees@yourcoaching.com>",
          to: [parentEmail],
          subject: emailContent.subject,
          html: emailContent.html,
        });

        console.log(`Email sent to ${parentEmail}:`, emailResponse);

        // Log the reminder
        await supabase
          .from('fee_reminders')
          .insert({
            fee_record_id: feeRecord.id,
            parent_id: feeRecord.parent_student_links?.[0]?.parent_id || feeRecord.student_id,
            reminder_type: reminderType,
            email_status: 'sent'
          });

        remindersSent++;
      } catch (emailError) {
        console.error(`Failed to send email to ${parentEmail}:`, emailError);
        
        // Log failed reminder
        await supabase
          .from('fee_reminders')
          .insert({
            fee_record_id: feeRecord.id,
            parent_id: feeRecord.parent_student_links?.[0]?.parent_id || feeRecord.student_id,
            reminder_type: reminderType,
            email_status: 'failed'
          });
      }
    }

    return new Response(JSON.stringify({ 
      success: true,
      remindersSent,
      totalUnpaidFees: unpaidFees?.length || 0,
      reminderType,
      date: currentDate.toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Fee reminder error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function generateReminderEmail(studentName: string, parentName: string, amount: number, dueDate: string, batteryLevel: number, reminderType: string) {
  const urgencyLevel = reminderType === 'final' ? 'URGENT' : reminderType === 'second' ? 'IMPORTANT' : 'REMINDER';
  const batteryEmoji = batteryLevel > 50 ? '🔋' : batteryLevel > 20 ? '🪫' : '🔴';
  
  const subjects = {
    first: `📢 ${urgencyLevel}: Fee Payment Due for ${studentName}`,
    second: `⚠️ ${urgencyLevel}: Fee Payment Overdue - Action Required!`,
    final: `🚨 ${urgencyLevel}: FINAL NOTICE - Immediate Payment Required!`
  };

  const tones = {
    first: 'We hope this message finds you well. This is a friendly reminder',
    second: 'We must inform you that payment is now overdue.',
    final: 'This is your FINAL NOTICE. Immediate action is required.'
  };

  const consequences = {
    first: 'To avoid any disruption in classes, please clear the dues at your earliest convenience.',
    second: 'Continued delay may affect your ward\'s attendance and access to study materials.',
    final: 'Failure to pay within 24 hours may result in temporary suspension from classes and loss of study materials access.'
  };

  return {
    subject: subjects[reminderType],
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #d32f2f; margin: 0;">⚡ COACHING INSTITUTE</h1>
          <h2 style="color: #666; margin: 5px 0;">Fee Payment ${urgencyLevel}</h2>
        </div>
        
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 15px 0; color: #333;">Dear ${parentName},</h3>
          <p style="margin: 10px 0; line-height: 1.6;">
            ${tones[reminderType]} that the monthly fee for <strong>${studentName}</strong> is pending payment.
          </p>
        </div>

        <div style="background: ${batteryLevel > 50 ? '#e8f5e8' : batteryLevel > 20 ? '#fff3cd' : '#f8d7da'}; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
          <h3 style="margin: 0 0 10px 0; color: ${batteryLevel > 50 ? '#155724' : batteryLevel > 20 ? '#856404' : '#721c24'};">
            ${batteryEmoji} Fee Status: ${batteryLevel}%
          </h3>
          <div style="background: #ddd; height: 20px; border-radius: 10px; overflow: hidden; margin: 10px 0;">
            <div style="background: ${batteryLevel > 50 ? '#28a745' : batteryLevel > 20 ? '#ffc107' : '#dc3545'}; height: 100%; width: ${batteryLevel}%; transition: width 0.3s;"></div>
          </div>
          <p style="margin: 5px 0; font-weight: bold;">Time remaining until fee suspension!</p>
        </div>

        <div style="background: #fff; border: 2px solid #007bff; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 15px 0; color: #007bff;">💳 Payment Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 8px 0; font-weight: bold;">Student Name:</td>
              <td style="padding: 8px 0;">${studentName}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 8px 0; font-weight: bold;">Amount Due:</td>
              <td style="padding: 8px 0; color: #d32f2f; font-weight: bold;">₹${amount}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 8px 0; font-weight: bold;">Due Date:</td>
              <td style="padding: 8px 0;">${new Date(dueDate).toLocaleDateString('en-IN')}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Days Overdue:</td>
              <td style="padding: 8px 0; color: #d32f2f;">${Math.max(0, Math.floor((new Date().getTime() - new Date(dueDate).getTime()) / (1000 * 60 * 60 * 24)))} days</td>
            </tr>
          </table>
        </div>

        <div style="background: ${reminderType === 'final' ? '#ffebee' : '#e3f2fd'}; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${reminderType === 'final' ? '#f44336' : '#2196f3'};">
          <p style="margin: 0; line-height: 1.6; font-weight: bold; color: ${reminderType === 'final' ? '#c62828' : '#1565c0'};">
            ${consequences[reminderType]}
          </p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="#" style="background: #4caf50; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
            💳 RECHARGE NOW - PAY ₹${amount}
          </a>
        </div>

        <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h4 style="margin: 0 0 10px 0; color: #333;">📞 Contact Information</h4>
          <p style="margin: 5px 0;">Office: +91-XXXXXXXXXX</p>
          <p style="margin: 5px 0;">WhatsApp: +91-XXXXXXXXXX</p>
          <p style="margin: 5px 0;">Email: fees@yourcoaching.com</p>
        </div>

        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px;">
          <p>This is an automated reminder. Please ignore if payment has already been made.</p>
          <p><strong>⚡ Coaching Institute</strong> - Excellence in Education</p>
        </div>
      </div>
    `
  };
}