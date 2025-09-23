-- Create enums for educational boards and classes
CREATE TYPE public.education_board AS ENUM (
    'CBSE',
    'ICSE', 
    'UP_BOARD',
    'BIHAR_BOARD',
    'RAJASTHAN_BOARD',
    'MAHARASHTRA_BOARD',
    'GUJARAT_BOARD',
    'WEST_BENGAL_BOARD',
    'KARNATAKA_BOARD',
    'TAMIL_NADU_BOARD',
    'KERALA_BOARD',
    'ANDHRA_PRADESH_BOARD',
    'TELANGANA_BOARD',
    'MADHYA_PRADESH_BOARD',
    'HARYANA_BOARD',
    'PUNJAB_BOARD',
    'ASSAM_BOARD',
    'ODISHA_BOARD',
    'JHARKHAND_BOARD',
    'CHHATTISGARH_BOARD',
    'UTTARAKHAND_BOARD',
    'HIMACHAL_PRADESH_BOARD',
    'JAMMU_KASHMIR_BOARD'
);

CREATE TYPE public.student_class AS ENUM (
    '1',
    '2', 
    '3',
    '4',
    '5',
    '6',
    '7',
    '8',
    '9',
    '10',
    '11',
    '12'
);

-- Add class and board columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN student_class student_class,
ADD COLUMN education_board education_board;

-- Add target class and board columns to tests table  
ALTER TABLE public.tests
ADD COLUMN target_class student_class,
ADD COLUMN target_board education_board;

-- Create index for better performance when filtering tests
CREATE INDEX idx_tests_target_class_board ON public.tests(target_class, target_board, is_published);

-- Update existing tests to have default values (can be updated by admin later)
UPDATE public.tests 
SET target_class = '10', target_board = 'CBSE' 
WHERE target_class IS NULL AND target_board IS NULL;