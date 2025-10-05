// Run this via: supabase functions invoke assign-student-to-batch --data '{"studentId":"0abec614-340e-4b6b-a415-93c8ad4165f4","batchId":"d616c8c9-1908-49b4-8391-2434dccf11a3","roadmapId":"7571b684-78fd-4ba0-9343-0c71bb8fa75e"}'

// Or call from frontend:
/*
const { data, error } = await supabase.functions.invoke('assign-student-to-batch', {
  body: {
    studentId: '0abec614-340e-4b6b-a415-93c8ad4165f4',
    batchId: 'd616c8c9-1908-49b4-8391-2434dccf11a3',
    roadmapId: '7571b684-78fd-4ba0-9343-0c71bb8fa75e'
  }
})
*/
