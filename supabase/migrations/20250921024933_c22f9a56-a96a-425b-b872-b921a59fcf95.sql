-- Update some records to simulate different battery levels for testing
UPDATE fee_records SET battery_level = 75 WHERE student_id = '01d44ea4-2d2f-4573-8f07-d69997a022d4';
UPDATE fee_records SET battery_level = 20 WHERE student_id = '02e35891-e9d2-43e1-897b-2c77e97bf728';
UPDATE fee_records SET battery_level = 5 WHERE student_id = '089215d4-5aa3-4fac-8d3a-8ff15c85f0f6';
UPDATE fee_records SET 
  is_paid = true, 
  paid_date = CURRENT_DATE, 
  battery_level = 100, 
  payment_method = 'upi' 
WHERE student_id = '0b80e426-6143-4b55-b780-40d3723d788a';