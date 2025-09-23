import React from 'react';
import StudentLearningPaths from './StudentLearningPaths';


const StudentDashboard: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Learning Hub</h1>
        <p className="text-muted-foreground">Create your own learning paths or explore guided paths</p>
      </div>

      {/* Learning Paths Component */}
      <StudentLearningPaths />
    </div>
  );
};

export default StudentDashboard;